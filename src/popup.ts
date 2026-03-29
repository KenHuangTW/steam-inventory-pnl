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

  async function loadRecords(): Promise<TrackedItemRecord[]> {
    const [manualRecords, importedRecords] = await Promise.all([
      storageGet<Record<string, TrackedItemRecord>>(MANUAL_STORAGE_KEY),
      storageGet<Record<string, TrackedItemRecord>>(IMPORTED_STORAGE_KEY)
    ]);
    const mergedRecords: Record<string, TrackedItemRecord> = {
      ...(importedRecords ?? {}),
      ...(manualRecords ?? {})
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
