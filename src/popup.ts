namespace SteamUpupPopup {
  const MANUAL_STORAGE_KEY = "trackedItems";
  const IMPORTED_STORAGE_KEY = "marketImportedItems";
  const UI_CONTEXT = SteamUpupShared.resolveUiContext();
  const UI = UI_CONTEXT.translations;

  interface TrackedItemRecord {
    key: string;
    appId: string;
    appName: string;
    displayName: string;
    marketHashName: string;
    listingUrl: string;
    quantity: number;
    customCost: number;
    feeRate: number;
    note: string;
    currencySymbol: string;
    updatedAt: string;
    source: "manual" | "market-history";
    assetId?: string;
    contextId?: string;
    sourceKey?: string;
  }

  function getStorageArea():
    | {
        get(keys: string | string[] | null, callback: (items: Record<string, unknown>) => void): void;
        remove(keys: string | string[], callback?: () => void): void;
      }
    | null {
    const extensionChrome = (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome;
    return extensionChrome?.storage?.local ?? null;
  }

  function storageGet<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      const storageArea = getStorageArea();
      if (!storageArea) {
        resolve(undefined);
        return;
      }

      storageArea.get([key], (items) => {
        resolve(items[key] as T | undefined);
      });
    });
  }

  function storageRemove(key: string): Promise<void> {
    return new Promise((resolve) => {
      const storageArea = getStorageArea();
      if (!storageArea) {
        resolve();
        return;
      }

      storageArea.remove(key, () => resolve());
    });
  }

  function coerceRecordText(value: unknown, fallback = ""): string {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    return fallback;
  }

  function coerceRecordNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      let normalized = value.replace(/[^\d,.-]/g, "");
      if (!normalized) {
        return null;
      }

      const lastComma = normalized.lastIndexOf(",");
      const lastDot = normalized.lastIndexOf(".");

      if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
          normalized = normalized.replace(/\./g, "").replace(",", ".");
        } else {
          normalized = normalized.replace(/,/g, "");
        }
      } else if (lastComma !== -1) {
        const decimals = normalized.length - lastComma - 1;
        normalized = decimals <= 2 ? normalized.replace(",", ".") : normalized.replace(/,/g, "");
      } else {
        normalized = normalized.replace(/,/g, "");
      }

      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  function normalizeStoredFeeRate(value: unknown, fallbackValue = 0.15): number {
    const parsedValue = coerceRecordNumber(value);
    if (parsedValue === null) {
      return fallbackValue;
    }

    const normalizedValue = parsedValue > 1 ? parsedValue / 100 : parsedValue;
    return Math.min(Math.max(normalizedValue, 0), 0.95);
  }

  function normalizeStoredQuantity(value: unknown): number {
    const parsedValue = coerceRecordNumber(value);
    return parsedValue !== null && parsedValue > 0 ? Math.floor(parsedValue) : 1;
  }

  function normalizeStoredUpdatedAt(value: unknown): string {
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
      return value;
    }

    return new Date(0).toISOString();
  }

  function normalizeStoredRecord(
    rawRecord: unknown,
    fallbackKey: string,
    sourceOverride?: "manual" | "market-history"
  ): TrackedItemRecord | null {
    if (!rawRecord || typeof rawRecord !== "object") {
      return null;
    }

    const candidate = rawRecord as Partial<TrackedItemRecord> & Record<string, unknown>;
    const key = coerceRecordText(candidate.key, fallbackKey) || fallbackKey;

    return {
      key,
      appId: coerceRecordText(candidate.appId),
      appName: coerceRecordText(candidate.appName),
      displayName: coerceRecordText(candidate.displayName),
      marketHashName: coerceRecordText(candidate.marketHashName),
      listingUrl: coerceRecordText(candidate.listingUrl),
      quantity: normalizeStoredQuantity(candidate.quantity),
      customCost: Math.max(0, coerceRecordNumber(candidate.customCost) ?? 0),
      feeRate: normalizeStoredFeeRate(candidate.feeRate),
      note: coerceRecordText(candidate.note),
      currencySymbol: coerceRecordText(candidate.currencySymbol, UI_CONTEXT.fallbackCurrencySymbol) || UI_CONTEXT.fallbackCurrencySymbol,
      updatedAt: normalizeStoredUpdatedAt(candidate.updatedAt),
      source: sourceOverride ?? (candidate.source === "market-history" ? "market-history" : "manual"),
      assetId: coerceRecordText(candidate.assetId) || undefined,
      contextId: coerceRecordText(candidate.contextId) || undefined,
      sourceKey: coerceRecordText(candidate.sourceKey) || undefined
    };
  }

  function normalizeStoredRecordMap(
    rawRecords: Record<string, unknown> | undefined,
    sourceOverride?: "manual" | "market-history"
  ): Record<string, TrackedItemRecord> {
    const normalizedRecords: Record<string, TrackedItemRecord> = {};

    for (const [storageKey, rawRecord] of Object.entries(rawRecords ?? {})) {
      const normalizedRecord = normalizeStoredRecord(rawRecord, storageKey, sourceOverride);
      if (!normalizedRecord) {
        continue;
      }

      normalizedRecords[normalizedRecord.key] = normalizedRecord;
    }

    return normalizedRecords;
  }

  async function loadRecords(): Promise<TrackedItemRecord[]> {
    const [manualRecords, importedRecords] = await Promise.all([
      storageGet<Record<string, unknown>>(MANUAL_STORAGE_KEY),
      storageGet<Record<string, unknown>>(IMPORTED_STORAGE_KEY)
    ]);
    const mergedRecords: Record<string, TrackedItemRecord> = {
      ...normalizeStoredRecordMap(importedRecords, "market-history"),
      ...normalizeStoredRecordMap(manualRecords, "manual")
    };

    return Object.values(mergedRecords).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(record: TrackedItemRecord): string {
    return `${record.currencySymbol} ${record.customCost.toLocaleString(UI_CONTEXT.numberLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  function renderRecords(records: TrackedItemRecord[]): void {
    document.documentElement.lang = UI_CONTEXT.locale;

    const countElement = document.querySelector<HTMLElement>("[data-role='count']");
    const listElement = document.querySelector<HTMLElement>("[data-role='list']");
    const popupTitleElement = document.querySelector<HTMLElement>("[data-role='popup-title']");
    const popupIntroElement = document.querySelector<HTMLElement>("[data-role='popup-intro']");
    const refreshButton = document.querySelector<HTMLButtonElement>("[data-role='refresh-button']");
    const clearButton = document.querySelector<HTMLButtonElement>("[data-role='clear-button']");

    if (!countElement || !listElement || !popupTitleElement || !popupIntroElement || !refreshButton || !clearButton) {
      return;
    }

    popupTitleElement.textContent = UI.popupTitle;
    popupIntroElement.textContent = UI.popupIntro;
    refreshButton.textContent = UI.popupRefresh;
    clearButton.textContent = UI.popupClearAll;
    countElement.textContent = SteamUpupShared.formatTrackedItemsCount(records.length, UI_CONTEXT.locale);

    if (records.length === 0) {
      listElement.innerHTML = `
        <div class="popup-empty">
          ${escapeHtml(UI.popupEmpty)}
        </div>
      `;
      return;
    }

    listElement.innerHTML = records
      .map(
        (record) => `
          <article class="popup-card">
            <div class="popup-card__top">
              <div>
                <h3>${escapeHtml(record.displayName)}</h3>
                <p>${escapeHtml(record.appName || UI.genericSteamItem)}</p>
              </div>
              <span class="popup-card__pill">${escapeHtml(SteamUpupShared.formatUnitCount(record.quantity, UI_CONTEXT.locale))}</span>
            </div>
            <div class="popup-card__meta">
              <span>${escapeHtml(UI.popupCost)}: ${escapeHtml(formatMoney(record))}</span>
              <span>${escapeHtml(UI.popupFee)}: ${SteamUpupShared.formatFeePercentValue(record.feeRate, UI_CONTEXT.locale)}%</span>
            </div>
            ${
              record.note || record.source === "market-history"
                ? `<div class="popup-card__note">${escapeHtml(
                    record.note || UI.importedFromMarketHistory
                  )}</div>`
                : ""
            }
            <div class="popup-card__footer">
              <span>${escapeHtml(new Date(record.updatedAt).toLocaleString(UI_CONTEXT.numberLocale))}</span>
              ${
                record.listingUrl
                  ? `<a href="${escapeHtml(record.listingUrl)}" target="_blank" rel="noreferrer">${escapeHtml(UI.popupOpen)}</a>`
                  : `<span>${escapeHtml(UI.popupLocalOnly)}</span>`
              }
            </div>
          </article>
        `
      )
      .join("");
  }

  async function refresh(): Promise<void> {
    renderRecords(await loadRecords());
  }

  function boot(): void {
    const refreshButton = document.querySelector<HTMLButtonElement>("[data-action='refresh']");
    const clearButton = document.querySelector<HTMLButtonElement>("[data-action='clear']");

    refreshButton?.addEventListener("click", () => {
      void refresh();
    });

    clearButton?.addEventListener("click", () => {
      const confirmed = window.confirm(UI.popupClearConfirm);
      if (!confirmed) {
        return;
      }

      void Promise.all([storageRemove(MANUAL_STORAGE_KEY), storageRemove(IMPORTED_STORAGE_KEY)]).then(() => {
        void refresh();
      });
    });

    void refresh();
  }

  document.addEventListener("DOMContentLoaded", boot);
}
