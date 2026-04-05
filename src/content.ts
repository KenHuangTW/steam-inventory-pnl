namespace SteamUpupContent {
  const MANUAL_STORAGE_KEY = "trackedItems";
  const IMPORTED_STORAGE_KEY = "marketImportedItems";
  const PANEL_POSITION_KEY = "panelPositions";
  const PANEL_CLASS = "steam-upup-panel";
  const INVENTORY_TOTALS_CLASS = "steam-upup-inventory-totals";
  const REFRESH_INTERVAL_MS = 5000;
  const PRICE_CACHE_TTL_MS = 60_000;
  const MARKET_HISTORY_PAGE_SIZE = 500;
  const CASE_OPENING_COST_BY_LOCALE: Partial<Record<SteamUpupShared.SupportedLocale, number>> = {
    "zh-TW": 79
  };
  const UI_CONTEXT = SteamUpupShared.resolveUiContext();
  const UI = UI_CONTEXT.translations;

  type RecordSource = "manual" | "market-history";
  type CostBasisKind = SteamUpupShared.CostBasisKind;
  type PresetCostBasisKind = Extract<CostBasisKind, "case-opening" | "weekly-drop">;

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
    source: RecordSource;
    costBasisKind?: CostBasisKind;
    assetId?: string;
    contextId?: string;
    sourceKey?: string;
  }

  interface ItemContext {
    key: string;
    appId: string;
    appName: string;
    displayName: string;
    marketHashName: string;
    listingUrl: string;
    mountElement: HTMLElement;
    placement: "append" | "prepend";
    layout: "default" | "inventory-left-floating";
    inlinePriceText?: string;
    assetId?: string;
    contextId?: string;
  }

  interface PriceSnapshot {
    grossPrice: number;
    grossText: string;
    currencySymbol: string;
    sourceLabel: string;
    fetchedAt: number;
  }

  interface PriceOverviewResponse {
    success?: boolean;
    lowest_price?: string;
    median_price?: string;
  }

  interface PanelPosition {
    x: number;
    y: number;
  }

  interface AssetSelection {
    appId: string;
    contextId: string;
    assetId: string;
  }

  interface SteamFeeConfig {
    walletFeePercent: number | null;
    walletFeeBase: number | null;
    walletFeeMinimum: number | null;
    defaultPublisherFeePercent: number | null;
    itemPublisherFeePercent: number | null;
  }

  interface ResolvedFeeModel {
    totalFeeRate: number;
    steamFeePercent: number;
    publisherFeePercent: number;
    walletFeeBase: number;
    walletFeeMinimum: number;
  }

  interface SteamFeeCalculation {
    buyerPaysMinor: number;
    sellerReceivesMinor: number;
    steamFeeMinor: number;
    publisherFeeMinor: number;
    totalFeesMinor: number;
  }

  interface SteamFeeBridgeRequest {
    requestId: string;
    direction: "buyer-to-seller" | "seller-to-buyer";
    amountMinor: number;
    totalFeeRate: number;
  }

  interface SteamFeeBridgeResponse {
    requestId: string;
    direction: "buyer-to-seller" | "seller-to-buyer";
    ok: boolean;
    buyerPaysMinor: number | null;
    sellerReceivesMinor: number | null;
  }

  interface PanelPricingMetrics {
    feeRate: number;
    estimatedNet: number | null;
    breakEvenGross: number | null;
  }

  interface InventoryTotalsMountTarget {
    parent: HTMLElement;
    before: ChildNode | null;
  }

  interface ActiveInventorySelection {
    appId: string;
    appName: string;
  }

  interface InventoryTotalsRecordContext {
    record: TrackedItemRecord;
    context: ItemContext;
    appName: string;
    quantity: number;
  }

  interface InventoryTotalsAccumulator {
    appId: string;
    appName: string;
    trackedItemsCount: number;
    totalQuantity: number;
    totalCost: number;
    pricedQuantity: number;
    pricedCost: number;
    missingPriceQuantity: number;
    totalNetValue: number;
    pricingUnavailable: boolean;
    currencySymbol: string;
    sortIndex: number;
  }

  interface InventoryTotalsGroup {
    appId: string;
    appName: string;
    trackedItemsCount: number;
    totalQuantity: number;
    totalCost: number;
    pricedQuantity: number;
    pricedCost: number;
    missingPriceQuantity: number;
    totalNetValue: number | null;
    totalReturnRate: number | null;
    pricingUnavailable: boolean;
    currencySymbol: string;
  }

  interface MarketHistoryResponse {
    success?: boolean;
    total_count?: number;
    start?: number;
    pagesize?: number;
    results_html?: string;
    hovers?: string;
    assets?: Record<string, unknown>;
  }

  interface MarketHistoryImportCandidate {
    key: string;
    sourceKey: string;
    transactionType: "buy" | "sell";
    appId: string;
    appName: string;
    displayName: string;
    marketHashName: string;
    listingUrl: string;
    customCost: number;
    currencySymbol: string;
    assetId: string;
    contextId: string;
    alternateTargets: MarketHistoryImportTarget[];
  }

  interface MarketHistoryImportTarget {
    key: string;
    assetId: string;
    contextId: string;
  }

  interface MarketHistorySyncResult {
    importedCount: number;
    importedKeys: string[];
  }

  interface HoverAssetLookup {
    appId: string;
    contextId: string;
    assetId: string;
    amount: string;
  }

  const priceCache = new Map<string, PriceSnapshot | null>();
  const priceCacheTimestamp = new Map<string, number>();
  const panelPositionCache: Record<string, PanelPosition> = {};
  let selectedInventoryAssetFromPage: AssetSelection | null = null;
  let steamFeeConfig: SteamFeeConfig | null = null;
  let scheduled = false;
  let isContextInvalidated = false;
  let panelPositionsLoaded = false;
  let layoutRefreshScheduled = false;
  let feeBridgeRequestCounter = 0;
  let inventoryObserver: MutationObserver | null = null;
  let refreshIntervalId: number | null = null;
  let marketHistorySyncPromise: Promise<MarketHistorySyncResult> | null = null;
  let autoMarketHistorySyncStarted = false;
  let inventoryTotalsRenderSequence = 0;

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message?: unknown }).message ?? "");
    }

    try {
      return String(error ?? "");
    } catch {
      return "";
    }
  }

  function isExtensionContextInvalidatedError(error: unknown): boolean {
    return /Extension context invalidated/i.test(getErrorMessage(error));
  }

  function deactivateExtensionContext(): void {
    if (isContextInvalidated) {
      return;
    }

    isContextInvalidated = true;
    scheduled = false;
    inventoryObserver?.disconnect();
    inventoryObserver = null;

    if (refreshIntervalId !== null) {
      window.clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }

    document.documentElement.setAttribute("data-steam-upup", "invalidated");
    console.info("[Steam Inventory PnL] extension context invalidated; waiting for page refresh.");
  }

  function getStorageArea():
    | {
        get(keys: string | string[] | null, callback: (items: Record<string, unknown>) => void): void;
        set(items: Record<string, unknown>, callback?: () => void): void;
        remove(keys: string | string[], callback?: () => void): void;
      }
    | null {
    const extensionChrome = (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome;
    const storageArea = extensionChrome?.storage?.local ?? null;

    if (!storageArea) {
      deactivateExtensionContext();
      return null;
    }

    return storageArea;
  }

  function storageGet<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      if (isContextInvalidated) {
        resolve(undefined);
        return;
      }

      try {
        const storageArea = getStorageArea();
        if (!storageArea) {
          resolve(undefined);
          return;
        }

        storageArea.get([key], (items) => {
          resolve(items[key] as T | undefined);
        });
      } catch (error) {
        if (isExtensionContextInvalidatedError(error)) {
          deactivateExtensionContext();
          resolve(undefined);
          return;
        }

        throw error;
      }
    });
  }

  function storageSet(key: string, value: unknown): Promise<void> {
    return new Promise((resolve) => {
      if (isContextInvalidated) {
        resolve();
        return;
      }

      try {
        const storageArea = getStorageArea();
        if (!storageArea) {
          resolve();
          return;
        }

        storageArea.set({ [key]: value }, () => resolve());
      } catch (error) {
        if (isExtensionContextInvalidatedError(error)) {
          deactivateExtensionContext();
          resolve();
          return;
        }

        throw error;
      }
    });
  }

  function storageRemove(key: string): Promise<void> {
    return new Promise((resolve) => {
      if (isContextInvalidated) {
        resolve();
        return;
      }

      try {
        const storageArea = getStorageArea();
        if (!storageArea) {
          resolve();
          return;
        }

        storageArea.remove(key, () => resolve());
      } catch (error) {
        if (isExtensionContextInvalidatedError(error)) {
          deactivateExtensionContext();
          resolve();
          return;
        }

        throw error;
      }
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
      return normalizeNumber(value);
    }

    return null;
  }

  function normalizeStoredFeeRate(value: unknown, fallbackValue = 0.15): number {
    const parsedValue = coerceRecordNumber(value);
    if (parsedValue === null) {
      return fallbackValue;
    }

    const normalizedValue = parsedValue > 1 ? parsedValue / 100 : parsedValue;
    return SteamUpupShared.normalizeFeeRate(Math.min(Math.max(normalizedValue, 0), 0.95));
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
    sourceOverride?: RecordSource
  ): TrackedItemRecord | null {
    if (!rawRecord || typeof rawRecord !== "object") {
      return null;
    }

    const candidate = rawRecord as Partial<TrackedItemRecord> & Record<string, unknown>;
    const key = coerceRecordText(candidate.key, fallbackKey) || fallbackKey;
    const source = sourceOverride ?? (candidate.source === "market-history" ? "market-history" : "manual");
    const costBasisKind =
      candidate.costBasisKind === "case-opening" || candidate.costBasisKind === "weekly-drop"
        ? candidate.costBasisKind
        : candidate.costBasisKind === "manual"
          ? "manual"
          : undefined;

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
      source,
      costBasisKind,
      assetId: coerceRecordText(candidate.assetId) || undefined,
      contextId: coerceRecordText(candidate.contextId) || undefined,
      sourceKey: coerceRecordText(candidate.sourceKey) || undefined
    };
  }

  // Older or migrated extension data can contain numeric fields as strings.
  function normalizeStoredRecordMap(
    rawRecords: Record<string, unknown> | undefined,
    sourceOverride?: RecordSource
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

  async function loadManualRecords(): Promise<Record<string, TrackedItemRecord>> {
    return normalizeStoredRecordMap(await storageGet<Record<string, unknown>>(MANUAL_STORAGE_KEY), "manual");
  }

  async function loadImportedRecords(): Promise<Record<string, TrackedItemRecord>> {
    return normalizeStoredRecordMap(await storageGet<Record<string, unknown>>(IMPORTED_STORAGE_KEY), "market-history");
  }

  async function loadPanelPositions(): Promise<Record<string, PanelPosition>> {
    return (await storageGet<Record<string, PanelPosition>>(PANEL_POSITION_KEY)) ?? {};
  }

  async function ensurePanelPositionsLoaded(): Promise<void> {
    if (panelPositionsLoaded) {
      return;
    }

    Object.assign(panelPositionCache, await loadPanelPositions());
    panelPositionsLoaded = true;
  }

  async function savePanelPosition(positionKey: string, position: PanelPosition): Promise<void> {
    panelPositionCache[positionKey] = position;
    panelPositionsLoaded = true;
    await storageSet(PANEL_POSITION_KEY, { ...panelPositionCache });
  }

  async function saveManualRecord(record: TrackedItemRecord): Promise<void> {
    const records = await loadManualRecords();
    records[record.key] = record;
    await storageSet(MANUAL_STORAGE_KEY, records);
  }

  async function saveImportedRecords(records: Record<string, TrackedItemRecord>): Promise<void> {
    if (Object.keys(records).length === 0) {
      await storageRemove(IMPORTED_STORAGE_KEY);
      return;
    }

    await storageSet(IMPORTED_STORAGE_KEY, records);
  }

  async function deleteManualRecord(key: string): Promise<void> {
    const records = await loadManualRecords();
    delete records[key];

    if (Object.keys(records).length === 0) {
      await storageRemove(MANUAL_STORAGE_KEY);
      return;
    }

    await storageSet(MANUAL_STORAGE_KEY, records);
  }

  async function deleteImportedRecord(key: string): Promise<void> {
    const records = await loadImportedRecords();
    delete records[key];

    if (Object.keys(records).length === 0) {
      await storageRemove(IMPORTED_STORAGE_KEY);
      return;
    }

    await storageSet(IMPORTED_STORAGE_KEY, records);
  }

  function scheduleScan(): void {
    if (scheduled || isContextInvalidated) {
      return;
    }

    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      void scanPage();
    });
  }

  function isVisible(element: HTMLElement): boolean {
    return element.getClientRects().length > 0;
  }

  function buildAssetKey(appId: string, contextId: string, assetId: string): string {
    return `asset::${appId}::${contextId}::${assetId}`;
  }

  function buildMarketKey(appId: string, marketHashName: string): string {
    return `${appId}::${marketHashName}`;
  }

  function parseListingUrl(listingUrl: string): ItemContext | null {
    let url: URL;

    try {
      url = new URL(listingUrl, window.location.origin);
    } catch {
      return null;
    }

    const match = url.pathname.match(/^\/market\/listings\/(\d+)\/(.+)$/);
    if (!match) {
      return null;
    }

    const appId = match[1];
    const marketHashName = decodeURIComponent(match[2]);
    const key = buildMarketKey(appId, marketHashName);

    return {
      key,
      appId,
      appName: "",
      displayName: marketHashName,
      marketHashName,
      listingUrl: `https://steamcommunity.com${url.pathname}`,
      mountElement: document.body,
      placement: "append",
      layout: "default"
    };
  }

  function createFallbackKey(appName: string, displayName: string): string {
    return `fallback::${appName.trim().toLowerCase()}::${displayName.trim().toLowerCase()}`;
  }

  function parseAssetSelectionCandidate(value: string): AssetSelection | null {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const patterns = [
      /#(\d{2,6})_(\d{1,4})_(\d{5,20})/,
      /(?:item|hover|history|myhistory|economy)[^0-9]{0,8}(\d{2,6})_(\d{1,4})_(\d{5,20})/i,
      /(?:^|[^\d])(\d{2,6})_(\d{1,4})_(\d{5,20})(?:[^\d]|$)/
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          appId: match[1],
          contextId: match[2],
          assetId: match[3]
        };
      }
    }

    return null;
  }

  function extractAssetSelectionFromNode(root: ParentNode): AssetSelection | null {
    const candidates: string[] = [];

    if (root instanceof HTMLElement) {
      candidates.push(root.id, root.outerHTML);

      for (const attribute of ["href", "onclick", "data-assetid", "data-contextid", "data-appid"]) {
        const value = root.getAttribute(attribute);
        if (value) {
          candidates.push(value);
        }
      }
    }

    if ("querySelectorAll" in root) {
      root.querySelectorAll<HTMLElement>("[id], [href], [onclick], [data-assetid], [data-contextid], [data-appid]").forEach(
        (element) => {
          candidates.push(element.id || "");
          for (const attribute of ["href", "onclick", "data-assetid", "data-contextid", "data-appid"]) {
            const value = element.getAttribute(attribute);
            if (value) {
              candidates.push(value);
            }
          }
        }
      );
    }

    for (const candidate of candidates) {
      const assetSelection = parseAssetSelectionCandidate(candidate);
      if (assetSelection) {
        return assetSelection;
      }
    }

    return null;
  }

  function resolveSelectedInventoryAsset(): AssetSelection | null {
    if (selectedInventoryAssetFromPage) {
      return selectedInventoryAssetFromPage;
    }

    const hashSelection = parseAssetSelectionCandidate(window.location.hash);
    if (hashSelection) {
      return hashSelection;
    }

    const selectedElement =
      document.querySelector<HTMLElement>(".activeInfo") ??
      document.querySelector<HTMLElement>(".inventory_item_link.active") ??
      document.querySelector<HTMLElement>(".inventory_item_link.selected") ??
      null;

    if (!selectedElement) {
      return null;
    }

    return extractAssetSelectionFromNode(selectedElement);
  }

  function injectPageSelectionBridge(): void {
    if (document.documentElement.dataset.steamUpupPageBridge === "true") {
      return;
    }

    document.documentElement.dataset.steamUpupPageBridge = "true";

    document.addEventListener("steam-upup:selected-asset", ((event: Event) => {
      const customEvent = event as CustomEvent<AssetSelection | null>;
      const detail = customEvent.detail;

      if (detail && detail.appId && detail.contextId && detail.assetId) {
        selectedInventoryAssetFromPage = {
          appId: String(detail.appId),
          contextId: String(detail.contextId),
          assetId: String(detail.assetId)
        };
        document.documentElement.setAttribute(
          "data-steam-upup-selected-asset",
          `${selectedInventoryAssetFromPage.appId}_${selectedInventoryAssetFromPage.contextId}_${selectedInventoryAssetFromPage.assetId}`
        );
      } else {
        selectedInventoryAssetFromPage = null;
        document.documentElement.removeAttribute("data-steam-upup-selected-asset");
      }

      scheduleScan();
    }) as EventListener);

    document.addEventListener("steam-upup:fee-config", ((event: Event) => {
      const customEvent = event as CustomEvent<SteamFeeConfig | null>;
      steamFeeConfig = customEvent.detail ?? null;

      if (steamFeeConfig) {
        document.documentElement.setAttribute("data-steam-upup-fee-config", JSON.stringify(steamFeeConfig));
      } else {
        document.documentElement.removeAttribute("data-steam-upup-fee-config");
      }

      scheduleScan();
    }) as EventListener);

    const bridgeScript = document.createElement("script");
    bridgeScript.type = "text/javascript";
    bridgeScript.dataset.steamUpupPageBridge = "true";
    bridgeScript.src = chrome.runtime.getURL("scripts/pageBridge.js");
    bridgeScript.addEventListener("load", () => {
      document.documentElement.setAttribute("data-steam-upup-page-bridge-status", "loaded");
    });
    bridgeScript.addEventListener("error", () => {
      document.documentElement.setAttribute("data-steam-upup-page-bridge-status", "error");
    });

    (document.head || document.documentElement).appendChild(bridgeScript);
  }

  function withAssetKey(context: ItemContext, assetSelection: AssetSelection | null): ItemContext {
    if (!assetSelection || !context.appId || assetSelection.appId !== context.appId) {
      return context;
    }

    return {
      ...context,
      key: buildAssetKey(context.appId, assetSelection.contextId, assetSelection.assetId),
      assetId: assetSelection.assetId,
      contextId: assetSelection.contextId
    };
  }

  function extractListingUrl(root: ParentNode): string {
    const directAnchor = root.querySelector<HTMLAnchorElement>("a[href*='/market/listings/']");
    if (directAnchor?.href) {
      return directAnchor.href;
    }

    const clickableElements = Array.from(root.querySelectorAll<HTMLElement>("[href], [onclick]"));

    for (const element of clickableElements) {
      const href = element.getAttribute("href") ?? "";
      const onclick = element.getAttribute("onclick") ?? "";
      const combined = `${href} ${onclick}`;

      const directUrlMatch = combined.match(
        /(?:https?:\/\/steamcommunity\.com)?\/market\/listings\/\d+\/[^'"\s)]+/i
      );

      if (directUrlMatch?.[0]) {
        return new URL(directUrlMatch[0], window.location.origin).href;
      }

      const functionMatch = onclick.match(
        /(?:ShowMarketPage|Market_LoadOrderSpread)\(\s*['"]?(\d+)['"]?\s*,\s*['"]([^'"]+)['"]/
      );

      if (functionMatch) {
        return `https://steamcommunity.com/market/listings/${functionMatch[1]}/${functionMatch[2]}`;
      }
    }

    return "";
  }

  function getTextWithoutPanel(root: ParentNode): string {
    if (!(root instanceof HTMLElement)) {
      return root.textContent ?? "";
    }

    const clonedRoot = root.cloneNode(true) as HTMLElement;
    clonedRoot.querySelectorAll(`.${PANEL_CLASS}`).forEach((element) => element.remove());
    return clonedRoot.innerText || clonedRoot.textContent || "";
  }

  function extractMoneySnippet(text: string): string {
    const normalized = text.replace(/\u00a0/g, " ").replace(/\r/g, " ");
    const currencyPattern =
      /((?:NT\$|HK\$|S\$|A\$|C\$|R\$|USD|EUR|GBP|JPY|CNY|TWD|CHF|CAD|AUD|SGD|NOK|SEK|DKK|PLN|CZK|TRY|RUB|INR|₩|¥|€|£|\$)\s*[\d.,]+)/i;
    const currencyMatch = normalized.match(currencyPattern);

    if (currencyMatch?.[1]) {
      return currencyMatch[1].trim();
    }

    const numberMatch = normalized.match(/[\d]+(?:[.,][\d]+)*/);
    return numberMatch?.[0]?.trim() ?? "";
  }

  function extractInlinePriceText(root: ParentNode): string {
    const candidateRoots: ParentNode[] = [];
    const marketActions = root.querySelector<HTMLElement>(".item_market_actions");
    const marketContent = root.querySelector<HTMLElement>(".item_market_content");

    if (marketActions) {
      candidateRoots.push(marketActions);
    }

    if (marketContent && marketContent !== marketActions) {
      candidateRoots.push(marketContent);
    }

    candidateRoots.push(root);

    for (const candidateRoot of candidateRoots) {
      const normalizedText = getTextWithoutPanel(candidateRoot).replace(/\u00a0/g, " ").replace(/\r/g, "");
      const priceLabelMatch = normalizedText.match(
        /(?:起始價位|Starting at|Starting price|Prix de depart|Ab|Desde|A partir de)[:\s]*([^\n]+)/i
      );

      if (priceLabelMatch?.[1]) {
        const snippet = extractMoneySnippet(priceLabelMatch[1]);
        if (snippet) {
          return snippet;
        }
      }

      const snippet = extractMoneySnippet(normalizedText);
      if (snippet) {
        return snippet;
      }
    }

    return "";
  }

  function textFromSelectors(selectors: string[], root: ParentNode = document): string {
    for (const selector of selectors) {
      const element = root.querySelector<HTMLElement>(selector);
      const text = element?.textContent?.trim();
      if (text) {
        return text;
      }
    }

    return "";
  }

  function extractMeaningfulLines(root: ParentNode): string[] {
    const rawText = getTextWithoutPanel(root);
    return rawText
      .replace(/\u00a0/g, " ")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter(
        (line) =>
          !/^(?:Steam UpUp|Steam Inventory PnL|Profit Snapshot|損益快照|Tracked|已追蹤|New|新物品|Custom cost|自訂成本|Quantity|數量|Fee %|手續費 %|Note|備註|Save|儲存|Reset|重設|Open listing|打開市集頁)$/i.test(
            line
          )
      )
      .filter((line) => !/^(?:起始價位|數量|標籤|在社群市集中檢視|市場價格|預估淨收|單件損益|總損益|回本售價|Market price|Estimated net|PnL \/ unit|Total PnL|Break-even gross)/i.test(line))
      .filter((line) => !/^(?:NT\$|\$|USD|EUR|GBP|JPY|TWD|CNY|R\$)/i.test(line))
      .filter((line) => !/^\d+\s*\/\s*\d+$/.test(line));
  }

  function getSteamLocalizationFallbacks(): Record<string, string> {
    if (UI_CONTEXT.locale.toLowerCase().startsWith("zh")) {
      return {
        "#ItemDescription_Tags": "璅惜:",
        "#SellOnMarket_View": "?函冗蝢文??葉瑼Ｚ?",
        "#SellOnMarket_SellThisItem": "鞎拙"
      };
    }

    return {
      "#ItemDescription_Tags": "Tags:",
      "#SellOnMarket_View": "View in Community Market",
      "#SellOnMarket_SellThisItem": "Sell"
    };
  }

  function repairSteamLocalizationText(root: ParentNode = document): void {
    const replacements = getSteamLocalizationFallbacks();
    const containers = Array.from(
      root.querySelectorAll<HTMLElement>(".inventory_iteminfo, .inventory_page_right")
    );

    for (const container of containers) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let currentNode = walker.nextNode();

      while (currentNode) {
        const textNode = currentNode as Text;
        const originalValue = textNode.nodeValue ?? "";
        let nextValue = originalValue;

        for (const [token, replacement] of Object.entries(replacements)) {
          if (nextValue.includes(token)) {
            nextValue = nextValue.split(token).join(replacement);
          }
        }

        if (nextValue !== originalValue) {
          textNode.nodeValue = nextValue;
        }

        currentNode = walker.nextNode();
      }
    }
  }

  function extractDisplayName(root: ParentNode, fallback: string): string {
    const explicitName = textFromSelectors(
      [
        "#largeiteminfo_item_name",
        ".market_listing_item_name",
        "[id$='_item_name']",
        ".hover_item_name",
        ".item_desc_name",
        ".inventory_item_name",
        ".item_desc_title"
      ],
      root
    );

    if (explicitName) {
      return explicitName;
    }

    const lines = extractMeaningfulLines(root);
    return lines[0] ?? fallback;
  }

  function extractAppName(root: ParentNode, displayName: string, fallback: string): string {
    const explicitAppName = textFromSelectors(
      [
        ".market_listing_game_name",
        "#largeiteminfo_game_name",
        ".item_desc_game_info",
        ".inventory_iteminfo_game",
        "[id$='_item_game_name']"
      ],
      root
    );

    if (explicitAppName) {
      return explicitAppName;
    }

    const lines = extractMeaningfulLines(root);
    const appLine = lines.find((line) => line !== displayName && line.length <= 40);
    return appLine ?? fallback;
  }

  function resolveMarketListingContext(): ItemContext | null {
    const baseContext = parseListingUrl(window.location.href);
    if (!baseContext) {
      return null;
    }

    const mountElement =
      document.querySelector<HTMLElement>(".market_listing_iteminfo") ??
      document.querySelector<HTMLElement>("#largeiteminfo") ??
      null;

    if (!mountElement) {
      return null;
    }

    return {
      ...baseContext,
      appName: extractAppName(mountElement, baseContext.displayName, UI.genericSteamItem),
      displayName: extractDisplayName(mountElement, baseContext.displayName),
      mountElement,
      placement: "append",
      layout: "default",
      inlinePriceText: extractInlinePriceText(mountElement)
    };
  }

  function resolveInventoryContexts(): ItemContext[] {
    const assetSelection = resolveSelectedInventoryAsset();
    const panels = Array.from(document.querySelectorAll<HTMLElement>(".inventory_iteminfo")).filter(isVisible);
    const contexts: ItemContext[] = [];

    for (const panel of panels) {
      const displayName = extractDisplayName(panel, UI.unknownItem);
      const appName = extractAppName(panel, displayName, UI.genericInventoryItem);
      const inlinePriceText = extractInlinePriceText(panel);
      const marketLink = panel.querySelector<HTMLAnchorElement>("a[href*='/market/listings/']");
      const mountElement =
        panel.querySelector<HTMLElement>(".item_desc_description") ??
        panel.querySelector<HTMLElement>(".inventory_iteminfo_contents") ??
        panel;

      if (!marketLink?.href) {
        const context: ItemContext = assetSelection
          ? {
              key: buildAssetKey(assetSelection.appId, assetSelection.contextId, assetSelection.assetId),
              appId: assetSelection.appId,
              appName,
              displayName,
              marketHashName: displayName,
              listingUrl: "",
              mountElement,
              placement: "prepend",
              layout: "default",
              inlinePriceText,
              assetId: assetSelection.assetId,
              contextId: assetSelection.contextId
            }
          : {
              key: createFallbackKey(appName, displayName),
              appId: "",
              appName,
              displayName,
              marketHashName: displayName,
              listingUrl: "",
              mountElement,
              placement: "prepend",
              layout: "default",
              inlinePriceText
            };
        contexts.push(context);
        continue;
      }

      const baseContext = parseListingUrl(marketLink.href);
      if (!baseContext) {
        const context: ItemContext = assetSelection
          ? {
              key: buildAssetKey(assetSelection.appId, assetSelection.contextId, assetSelection.assetId),
              appId: assetSelection.appId,
              appName,
              displayName,
              marketHashName: displayName,
              listingUrl: marketLink.href,
              mountElement,
              placement: "prepend",
              layout: "default",
              inlinePriceText,
              assetId: assetSelection.assetId,
              contextId: assetSelection.contextId
            }
          : {
              key: createFallbackKey(appName, displayName),
              appId: "",
              appName,
              displayName,
              marketHashName: displayName,
              listingUrl: marketLink.href,
              mountElement,
              placement: "prepend",
              layout: "default",
              inlinePriceText
            };
        contexts.push(context);
        continue;
      }

      contexts.push(withAssetKey({
        ...baseContext,
        appName,
        displayName: baseContext.marketHashName || displayName,
        mountElement,
        placement: "prepend",
        layout: "default",
        inlinePriceText
      }, assetSelection));
    }

    return contexts;
  }

  function resolveInventorySidebarContexts(): ItemContext[] {
    const assetSelection = resolveSelectedInventoryAsset();
    const sidebars = Array.from(document.querySelectorAll<HTMLElement>(".inventory_page_right")).filter(
      (element) =>
        isVisible(element) &&
        /(?:起始價位|Starting at|Starting price|View in Community Market|在社群市集中檢視)/i.test(
          element.innerText || ""
        )
    );

    const contexts: ItemContext[] = [];
    const candidateSidebars =
      sidebars.length > 0
        ? sidebars
        : Array.from(document.querySelectorAll<HTMLElement>(".inventory_page_right")).filter(
            (element) =>
              isVisible(element) &&
              (!!textFromSelectors(
                [
                  ".inventory_item_name",
                  ".item_desc_name",
                  ".item_desc_title",
                  "[id$='_item_name']",
                  ".hover_item_name"
                ],
                element
              ) ||
                !!element.querySelector(".item_desc_description, a[href*='/market/listings/'], .item_market_actions"))
          );

    for (const sidebar of candidateSidebars) {
      const displayName = extractDisplayName(sidebar, UI.unknownItem);
      const appName = extractAppName(sidebar, displayName, UI.genericInventoryItem);
      const inlinePriceText = extractInlinePriceText(sidebar);
      const listingUrl = extractListingUrl(sidebar);
      const mountElement = sidebar.closest<HTMLElement>(".inventory_page") ?? sidebar;

      if (listingUrl) {
        const parsedContext = parseListingUrl(listingUrl);
        if (parsedContext) {
          contexts.push(withAssetKey({
            ...parsedContext,
            appName,
            displayName: parsedContext.marketHashName || displayName,
            listingUrl,
            mountElement,
            placement: "prepend",
            layout: "inventory-left-floating",
            inlinePriceText
          }, assetSelection));
          continue;
        }
      }

      contexts.push(
        assetSelection
          ? {
              key: buildAssetKey(assetSelection.appId, assetSelection.contextId, assetSelection.assetId),
              appId: assetSelection.appId,
              appName,
              displayName,
              marketHashName: displayName,
              listingUrl,
              mountElement,
              placement: "prepend",
              layout: "inventory-left-floating",
              inlinePriceText,
              assetId: assetSelection.assetId,
              contextId: assetSelection.contextId
            }
          : {
              key: createFallbackKey(appName, displayName),
              appId: "",
              appName,
              displayName,
              marketHashName: displayName,
              listingUrl,
              mountElement,
              placement: "prepend",
              layout: "inventory-left-floating",
              inlinePriceText
            }
      );
    }

    return contexts;
  }

  function normalizeNumber(rawValue: string): number | null {
    let normalized = rawValue.replace(/[^\d,.-]/g, "");
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

  function parseMoney(text: string): { amount: number | null; currencySymbol: string } {
    const snippet = extractMoneySnippet(text) || text;
    const amount = normalizeNumber(snippet);
    const currencySymbol = snippet.replace(/[\d\s,.-]/g, "").trim() || UI_CONTEXT.fallbackCurrencySymbol;
    return { amount, currencySymbol };
  }

  function buildInlinePriceSnapshot(context: ItemContext): PriceSnapshot | null {
    if (!context.inlinePriceText) {
      return null;
    }

    const parsedInlinePrice = parseMoney(context.inlinePriceText);
    if (parsedInlinePrice.amount === null) {
      return null;
    }

    return {
      grossPrice: parsedInlinePrice.amount,
      grossText: formatMoney(parsedInlinePrice.amount, parsedInlinePrice.currencySymbol),
      currencySymbol: parsedInlinePrice.currencySymbol,
      sourceLabel: UI.sourcePriceOnPage,
      fetchedAt: Date.now()
    };
  }

  function getPriceCacheKey(context: ItemContext): string {
    if (context.appId && context.marketHashName) {
      return buildMarketKey(context.appId, context.marketHashName);
    }

    return context.key;
  }

  function formatMoney(amount: number | null, currencySymbol: string): string {
    if (amount === null || !Number.isFinite(amount)) {
      return UI.unavailable;
    }

    const hasFraction = Math.abs(amount % 1) > 0.0001;
    const formatted = amount.toLocaleString(UI_CONTEXT.numberLocale, {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2
    });
    return `${currencySymbol} ${formatted}`;
  }

  function getCurrencyScale(currencySymbol: string): number {
    const normalizedSymbol = currencySymbol.trim().toUpperCase();
    if (normalizedSymbol === "NT$" || normalizedSymbol === "TWD") {
      return 1;
    }

    return UI_CONTEXT.steamCurrencyCode === 30 ? 1 : 100;
  }

  function toMinorMoney(amount: number, currencySymbol: string, rounding: "round" | "ceil" = "round"): number {
    const scaledAmount = amount * getCurrencyScale(currencySymbol);
    const roundedAmount =
      rounding === "ceil" ? Math.ceil(scaledAmount - 0.0000001) : Math.round(scaledAmount);
    return Math.max(0, roundedAmount);
  }

  function fromMinorMoney(amountMinor: number, currencySymbol: string): number {
    return amountMinor / getCurrencyScale(currencySymbol);
  }

  function toSafeNumber(value: number | null | undefined): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }

    return Math.max(value, 0);
  }

  function getFallbackWalletFeeBase(): number {
    return UI_CONTEXT.steamCurrencyCode === 30 ? 1 : 0;
  }

  function sanitizeFeePercent(value: number | null, fallbackValue: number, maxValue: number): number {
    if (value === null || !Number.isFinite(value) || value < 0 || value > maxValue) {
      return fallbackValue;
    }

    return value;
  }

  function sanitizeMinorFeeValue(value: number | null, fallbackValue: number, maxValue: number): number {
    if (value === null || !Number.isFinite(value)) {
      return fallbackValue;
    }

    const roundedValue = Math.round(value);
    if (roundedValue < 0 || roundedValue > maxValue) {
      return fallbackValue;
    }

    return roundedValue;
  }

  function buildFallbackFeeModel(totalFeeRate: number): ResolvedFeeModel {
    const normalizedTotalFeeRate = SteamUpupShared.normalizeFeeRate(Math.max(totalFeeRate, 0));
    const steamFeePercent =
      normalizedTotalFeeRate <= 0 ? 0 : SteamUpupShared.normalizeFeeRate(Math.min(normalizedTotalFeeRate, 0.05));
    const publisherFeePercent = SteamUpupShared.normalizeFeeRate(Math.max(normalizedTotalFeeRate - steamFeePercent, 0));

    return {
      totalFeeRate: normalizedTotalFeeRate,
      steamFeePercent,
      publisherFeePercent,
      walletFeeBase: getFallbackWalletFeeBase(),
      walletFeeMinimum: 1
    };
  }

  function resolveFeeModel(record: TrackedItemRecord | undefined): ResolvedFeeModel {
    const storedTotalFeeRate = SteamUpupShared.normalizeFeeRate(record?.feeRate ?? 0.15);
    const fallbackFeeModel = buildFallbackFeeModel(storedTotalFeeRate);
    const configuredSteamFeePercent = sanitizeFeePercent(
      toSafeNumber(steamFeeConfig?.walletFeePercent),
      fallbackFeeModel.steamFeePercent,
      0.1
    );
    const rawItemPublisherFeePercent = toSafeNumber(steamFeeConfig?.itemPublisherFeePercent);
    const rawDefaultPublisherFeePercent = toSafeNumber(steamFeeConfig?.defaultPublisherFeePercent);
    const configuredItemPublisherFeePercent =
      rawItemPublisherFeePercent !== null && rawItemPublisherFeePercent <= 0.2
        ? rawItemPublisherFeePercent
        : null;
    const configuredDefaultPublisherFeePercent =
      rawDefaultPublisherFeePercent !== null && rawDefaultPublisherFeePercent <= 0.2
        ? rawDefaultPublisherFeePercent
        : null;
    const configuredPublisherFeePercent =
      configuredItemPublisherFeePercent ?? configuredDefaultPublisherFeePercent;
    const resolvedSteamFeePercent = SteamUpupShared.normalizeFeeRate(
      storedTotalFeeRate <= 0 ? 0 : Math.min(configuredSteamFeePercent, Math.max(storedTotalFeeRate, 0.05))
    );
    const resolvedPublisherFeePercent = SteamUpupShared.normalizeFeeRate(
      configuredPublisherFeePercent !== null
        ? Math.max(configuredPublisherFeePercent, 0)
        : Math.max(storedTotalFeeRate - Math.min(resolvedSteamFeePercent, storedTotalFeeRate), 0)
    );
    const totalFeeRate = SteamUpupShared.normalizeFeeRate(Math.max(resolvedSteamFeePercent + resolvedPublisherFeePercent, 0));
    const walletFeeBase = sanitizeMinorFeeValue(
      toSafeNumber(steamFeeConfig?.walletFeeBase),
      fallbackFeeModel.walletFeeBase,
      2
    );
    const walletFeeMinimum = sanitizeMinorFeeValue(
      toSafeNumber(steamFeeConfig?.walletFeeMinimum),
      fallbackFeeModel.walletFeeMinimum,
      2
    );

    const resolvedFeeModel: ResolvedFeeModel = {
      totalFeeRate,
      steamFeePercent: resolvedSteamFeePercent,
      publisherFeePercent: resolvedPublisherFeePercent,
      walletFeeBase,
      walletFeeMinimum
    };

    const looksSuspicious =
      resolvedFeeModel.steamFeePercent > 0.1 ||
      resolvedFeeModel.publisherFeePercent > 0.2 ||
      resolvedFeeModel.walletFeeBase > 2 ||
      resolvedFeeModel.walletFeeMinimum > 2;

    if (looksSuspicious) {
      return fallbackFeeModel;
    }

    return resolvedFeeModel;
  }

  function calculateBuyerPaysForSellerReceivesMinor(
    sellerReceivesMinor: number,
    feeModel: ResolvedFeeModel
  ): SteamFeeCalculation {
    const safeSellerReceivesMinor = Math.max(0, Math.round(sellerReceivesMinor));
    if (safeSellerReceivesMinor === 0 || feeModel.totalFeeRate <= 0) {
      return {
        buyerPaysMinor: safeSellerReceivesMinor,
        sellerReceivesMinor: safeSellerReceivesMinor,
        steamFeeMinor: 0,
        publisherFeeMinor: 0,
        totalFeesMinor: 0
      };
    }

    const steamFeeMinor = Math.floor(
      Math.max(safeSellerReceivesMinor * feeModel.steamFeePercent, feeModel.walletFeeMinimum) +
        feeModel.walletFeeBase
    );
    const publisherFeeMinor = Math.floor(
      feeModel.publisherFeePercent > 0 ? Math.max(safeSellerReceivesMinor * feeModel.publisherFeePercent, 1) : 0
    );
    const totalFeesMinor = steamFeeMinor + publisherFeeMinor;

    return {
      buyerPaysMinor: safeSellerReceivesMinor + totalFeesMinor,
      sellerReceivesMinor: safeSellerReceivesMinor,
      steamFeeMinor,
      publisherFeeMinor,
      totalFeesMinor
    };
  }

  function calculateSellerReceivesFromBuyerPaysMinor(
    buyerPaysMinor: number,
    feeModel: ResolvedFeeModel
  ): SteamFeeCalculation {
    const safeBuyerPaysMinor = Math.max(0, Math.round(buyerPaysMinor));
    if (safeBuyerPaysMinor === 0 || feeModel.totalFeeRate <= 0) {
      return {
        buyerPaysMinor: safeBuyerPaysMinor,
        sellerReceivesMinor: safeBuyerPaysMinor,
        steamFeeMinor: 0,
        publisherFeeMinor: 0,
        totalFeesMinor: 0
      };
    }

    const divisor = feeModel.steamFeePercent + feeModel.publisherFeePercent + 1;
    let estimatedSellerReceivesMinor = Math.max(
      0,
      Math.floor((safeBuyerPaysMinor - feeModel.walletFeeBase) / divisor)
    );
    let everUndershot = false;
    let calculation = calculateBuyerPaysForSellerReceivesMinor(estimatedSellerReceivesMinor, feeModel);
    let iterations = 0;

    while (calculation.buyerPaysMinor !== safeBuyerPaysMinor && iterations < 10) {
      if (calculation.buyerPaysMinor > safeBuyerPaysMinor) {
        if (everUndershot) {
          const adjustedCalculation = calculateBuyerPaysForSellerReceivesMinor(
            Math.max(0, estimatedSellerReceivesMinor - 1),
            feeModel
          );
          const adjustment = safeBuyerPaysMinor - adjustedCalculation.buyerPaysMinor;
          const steamFeeMinor = adjustedCalculation.steamFeeMinor + adjustment;
          const totalFeesMinor = adjustedCalculation.totalFeesMinor + adjustment;

          return {
            buyerPaysMinor: safeBuyerPaysMinor,
            sellerReceivesMinor: safeBuyerPaysMinor - totalFeesMinor,
            steamFeeMinor,
            publisherFeeMinor: adjustedCalculation.publisherFeeMinor,
            totalFeesMinor
          };
        }

        estimatedSellerReceivesMinor = Math.max(0, estimatedSellerReceivesMinor - 1);
      } else {
        everUndershot = true;
        estimatedSellerReceivesMinor += 1;
      }

      calculation = calculateBuyerPaysForSellerReceivesMinor(estimatedSellerReceivesMinor, feeModel);
      iterations += 1;
    }

    return {
      buyerPaysMinor: safeBuyerPaysMinor,
      sellerReceivesMinor: safeBuyerPaysMinor - calculation.totalFeesMinor,
      steamFeeMinor: calculation.steamFeeMinor,
      publisherFeeMinor: calculation.publisherFeeMinor,
      totalFeesMinor: calculation.totalFeesMinor
    };
  }

  function estimateNet(grossPrice: number, currencySymbol: string, feeModel: ResolvedFeeModel): number {
    const calculation = calculateSellerReceivesFromBuyerPaysMinor(
      toMinorMoney(grossPrice, currencySymbol),
      feeModel
    );
    return fromMinorMoney(calculation.sellerReceivesMinor, currencySymbol);
  }

  function computeBreakEvenGross(
    customCost: number,
    currencySymbol: string,
    feeModel: ResolvedFeeModel
  ): number | null {
    if (!Number.isFinite(customCost) || customCost < 0) {
      return null;
    }

    const calculation = calculateBuyerPaysForSellerReceivesMinor(
      toMinorMoney(customCost, currencySymbol, "ceil"),
      feeModel
    );

    return fromMinorMoney(calculation.buyerPaysMinor, currencySymbol);
  }

  function requestFeeBridgeCalculation(
    direction: SteamFeeBridgeRequest["direction"],
    amountMinor: number,
    feeModel: ResolvedFeeModel
  ): Promise<SteamFeeCalculation | null> {
    return new Promise((resolve) => {
      if (isContextInvalidated) {
        resolve(null);
        return;
      }

      const requestId = `steam-upup-fee-${Date.now()}-${feeBridgeRequestCounter++}`;
      const request: SteamFeeBridgeRequest = {
        requestId,
        direction,
        amountMinor: Math.max(0, Math.round(amountMinor)),
        totalFeeRate: feeModel.totalFeeRate
      };

      const timeoutId = window.setTimeout(() => {
        document.removeEventListener("steam-upup:fee-calc-response", onResponse as EventListener);
        resolve(null);
      }, 400);

      const onResponse = (event: Event) => {
        const customEvent = event as CustomEvent<SteamFeeBridgeResponse | null>;
        const detail = customEvent.detail;

        if (!detail || detail.requestId !== requestId) {
          return;
        }

        window.clearTimeout(timeoutId);
        document.removeEventListener("steam-upup:fee-calc-response", onResponse as EventListener);

        if (!detail.ok || detail.buyerPaysMinor === null || detail.sellerReceivesMinor === null) {
          resolve(null);
          return;
        }

        resolve({
          buyerPaysMinor: detail.buyerPaysMinor,
          sellerReceivesMinor: detail.sellerReceivesMinor,
          steamFeeMinor: Math.max(0, detail.buyerPaysMinor - detail.sellerReceivesMinor),
          publisherFeeMinor: 0,
          totalFeesMinor: Math.max(0, detail.buyerPaysMinor - detail.sellerReceivesMinor)
        });
      };

      document.addEventListener("steam-upup:fee-calc-response", onResponse as EventListener);
      document.dispatchEvent(new CustomEvent("steam-upup:fee-calc-request", { detail: request }));
    });
  }

  async function resolvePanelPricingMetrics(
    record: TrackedItemRecord | undefined,
    priceSnapshot: PriceSnapshot | null,
    currencySymbol: string
  ): Promise<PanelPricingMetrics> {
    const feeModel = resolveFeeModel(record);
    const grossPrice = priceSnapshot?.grossPrice ?? null;
    const estimatedNet = grossPrice === null ? null : estimateNet(grossPrice, currencySymbol, feeModel);
    const breakEvenGross = record ? computeBreakEvenGross(record.customCost, currencySymbol, feeModel) : null;

    return {
      feeRate: feeModel.totalFeeRate,
      estimatedNet,
      breakEvenGross
    };
  }

  async function fetchPriceSnapshot(context: ItemContext): Promise<PriceSnapshot | null> {
    const inlineSnapshot = buildInlinePriceSnapshot(context);

    if (!context.appId || !context.marketHashName) {
      return inlineSnapshot;
    }

    const cacheKey = getPriceCacheKey(context);
    const cached = priceCache.get(cacheKey);
    const cachedAt = priceCacheTimestamp.get(cacheKey) ?? 0;

    if (cached !== undefined && Date.now() - cachedAt < PRICE_CACHE_TTL_MS) {
      return cached;
    }

    const endpoint =
      `https://steamcommunity.com/market/priceoverview/?appid=${encodeURIComponent(context.appId)}` +
      `&currency=${UI_CONTEXT.steamCurrencyCode}` +
      `&market_hash_name=${encodeURIComponent(context.marketHashName)}`;

    try {
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as PriceOverviewResponse;
      const priceText = payload.lowest_price ?? payload.median_price ?? "";

      if (!payload.success || !priceText) {
        priceCache.set(cacheKey, inlineSnapshot);
        priceCacheTimestamp.set(cacheKey, Date.now());
        return inlineSnapshot;
      }

      const parsed = parseMoney(priceText);
      if (parsed.amount === null) {
        priceCache.set(cacheKey, inlineSnapshot);
        priceCacheTimestamp.set(cacheKey, Date.now());
        return inlineSnapshot;
      }

      const snapshot: PriceSnapshot = {
        grossPrice: parsed.amount,
        grossText: priceText,
        currencySymbol: parsed.currencySymbol,
        sourceLabel: payload.lowest_price ? UI.sourceLowestListing : UI.sourceMedianPrice,
        fetchedAt: Date.now()
      };

      priceCache.set(cacheKey, snapshot);
      priceCacheTimestamp.set(cacheKey, Date.now());
      return snapshot;
    } catch {
      priceCache.set(cacheKey, inlineSnapshot);
      priceCacheTimestamp.set(cacheKey, Date.now());
      return inlineSnapshot;
    }
  }

  function formatMarketHistorySyncSuccess(importedCount: number, matchedCurrentItem: boolean): string {
    if (UI_CONTEXT.locale === "zh-TW") {
      if (importedCount === 0) {
        return "\u6c92\u6709\u627e\u5230\u53ef\u5957\u7528\u7684\u5e02\u96c6\u8cb7\u5165\u7d00\u9304\u3002";
      }

      return matchedCurrentItem
        ? `\u5df2\u540c\u6b65 ${importedCount} \u7b46\u5e02\u96c6\u8cb7\u5165\u7d00\u9304\uff0c\u9019\u4ef6\u7269\u54c1\u5df2\u81ea\u52d5\u5957\u7528\u6210\u672c\u3002`
        : `\u5df2\u540c\u6b65 ${importedCount} \u7b46\u5e02\u96c6\u8cb7\u5165\u7d00\u9304\u3002`;
    }

    if (importedCount === 0) {
      return "No market buy records were available to import.";
    }

    return matchedCurrentItem
      ? `Imported ${importedCount} market buy records and matched the current inventory item.`
      : `Imported ${importedCount} market buy records.`;
  }

  function formatMarketHistorySyncError(error: unknown): string {
    const message = getErrorMessage(error);

    if (UI_CONTEXT.locale === "zh-TW") {
      return message
        ? `\u540c\u6b65\u5e02\u96c6\u7d00\u9304\u5931\u6557\uff1a${message}`
        : "\u540c\u6b65\u5e02\u96c6\u7d00\u9304\u5931\u6557\u3002";
    }

    return message ? `Market history sync failed: ${message}` : "Market history sync failed.";
  }

  function resolveRecordForContext(
    context: ItemContext,
    manualRecords: Record<string, TrackedItemRecord>,
    importedRecords: Record<string, TrackedItemRecord>
  ): TrackedItemRecord | undefined {
    return manualRecords[context.key] ?? importedRecords[context.key];
  }

  function findMatchingCandidatesForContext(
    context: ItemContext,
    records: Record<string, TrackedItemRecord>
  ): TrackedItemRecord[] {
    const dedupedCandidates = new Map<string, TrackedItemRecord>();
    const normalizedContextMarketHashName = context.marketHashName.trim().toLowerCase();
    const normalizedContextDisplayName = context.displayName.trim().toLowerCase();

    for (const record of Object.values(records)) {
      const normalizedRecordMarketHashName = record.marketHashName.trim().toLowerCase();
      const normalizedRecordDisplayName = record.displayName.trim().toLowerCase();
      const matchesName =
        normalizedRecordMarketHashName === normalizedContextMarketHashName ||
        normalizedRecordDisplayName === normalizedContextDisplayName;

      if (record.appId !== context.appId || !matchesName) {
        continue;
      }

      const sourceKey = record.sourceKey ?? record.key;
      if (!dedupedCandidates.has(sourceKey)) {
        dedupedCandidates.set(sourceKey, record);
      }
    }

    return Array.from(dedupedCandidates.values());
  }

  function resolveFallbackRecordForContext(
    context: ItemContext,
    manualRecords: Record<string, TrackedItemRecord>,
    importedRecords: Record<string, TrackedItemRecord>
  ): TrackedItemRecord | undefined {
    const manualCandidates = findMatchingCandidatesForContext(context, manualRecords);
    if (manualCandidates.length === 1) {
      return manualCandidates[0];
    }

    if (manualCandidates.length > 1) {
      return undefined;
    }

    const importedCandidates = findMatchingCandidatesForContext(context, importedRecords);
    return importedCandidates.length === 1 ? importedCandidates[0] : undefined;
  }

  async function aliasImportedRecordToContext(
    context: ItemContext,
    manualRecords?: Record<string, TrackedItemRecord>,
    importedRecords?: Record<string, TrackedItemRecord>
  ): Promise<TrackedItemRecord | null> {
    if (!context.assetId || !context.contextId) {
      return null;
    }

    const nextManualRecords = manualRecords ?? (await loadManualRecords());
    const nextImportedRecords = importedRecords ?? (await loadImportedRecords());

    if (nextManualRecords[context.key] || nextImportedRecords[context.key]) {
      return nextManualRecords[context.key] ?? nextImportedRecords[context.key] ?? null;
    }

    const candidates = findMatchingCandidatesForContext(context, nextImportedRecords);
    if (candidates.length !== 1) {
      return null;
    }

    const candidate = candidates[0];
    const aliasedRecord: TrackedItemRecord = {
      ...candidate,
      key: context.key,
      assetId: context.assetId,
      contextId: context.contextId,
      updatedAt: new Date().toISOString(),
      sourceKey: candidate.sourceKey ?? candidate.key
    };

    nextImportedRecords[context.key] = aliasedRecord;
    await saveImportedRecords(nextImportedRecords);
    return aliasedRecord;
  }

  function createImportedRecord(
    candidate: MarketHistoryImportCandidate,
    existingRecord: TrackedItemRecord | undefined,
    target?: MarketHistoryImportTarget
  ): TrackedItemRecord {
    const resolvedTarget = target ?? {
      key: candidate.key,
      assetId: candidate.assetId,
      contextId: candidate.contextId
    };

    return {
      key: resolvedTarget.key,
      appId: candidate.appId,
      appName: existingRecord?.appName || candidate.appName,
      displayName: existingRecord?.displayName || candidate.displayName,
      marketHashName: candidate.marketHashName,
      listingUrl: candidate.listingUrl,
      quantity: existingRecord?.quantity ?? 1,
      customCost: candidate.customCost,
      feeRate: SteamUpupShared.normalizeFeeRate(existingRecord?.feeRate ?? 0.15),
      note: existingRecord?.note ?? "",
      currencySymbol: candidate.currencySymbol,
      updatedAt: new Date().toISOString(),
      source: "market-history",
      assetId: resolvedTarget.assetId,
      contextId: resolvedTarget.contextId,
      sourceKey: existingRecord?.sourceKey ?? candidate.sourceKey
    };
  }

  function removeImportedRecordsBySourceKey(
    records: Record<string, TrackedItemRecord>,
    sourceKey: string
  ): void {
    for (const [key, record] of Object.entries(records)) {
      const recordSourceKey = record.sourceKey ?? record.key;
      if (recordSourceKey === sourceKey) {
        delete records[key];
      }
    }
  }

  function findImportedRecordsByMarketHashName(
    records: Record<string, TrackedItemRecord>,
    appId: string,
    marketHashName: string
  ): TrackedItemRecord[] {
    const dedupedCandidates = new Map<string, TrackedItemRecord>();
    const normalizedMarketHashName = marketHashName.trim().toLowerCase();

    for (const record of Object.values(records)) {
      if (record.appId !== appId) {
        continue;
      }

      const matchesName =
        record.marketHashName.trim().toLowerCase() === normalizedMarketHashName ||
        record.displayName.trim().toLowerCase() === normalizedMarketHashName;

      if (!matchesName) {
        continue;
      }

      const sourceKey = record.sourceKey ?? record.key;
      if (!dedupedCandidates.has(sourceKey)) {
        dedupedCandidates.set(sourceKey, record);
      }
    }

    return Array.from(dedupedCandidates.values());
  }

  function reconcileMarketHistorySale(
    candidate: MarketHistoryImportCandidate,
    records: Record<string, TrackedItemRecord>
  ): void {
    const targets = [
      {
        key: candidate.key,
        assetId: candidate.assetId,
        contextId: candidate.contextId
      },
      ...candidate.alternateTargets
    ];

    for (const target of targets) {
      const exactRecord = records[target.key];
      if (exactRecord) {
        removeImportedRecordsBySourceKey(records, exactRecord.sourceKey ?? exactRecord.key);
        return;
      }
    }

    const fallbackCandidates = findImportedRecordsByMarketHashName(records, candidate.appId, candidate.marketHashName);
    const fallbackRecord = fallbackCandidates[0];
    if (fallbackRecord) {
      removeImportedRecordsBySourceKey(records, fallbackRecord.sourceKey ?? fallbackRecord.key);
    }
  }

  function parseHoverAssetLookupMap(hoversSource: string): Record<string, HoverAssetLookup> {
    const hoverLookup: Record<string, HoverAssetLookup> = {};
    const hoverPattern =
      /CreateItemHoverFromContainer\([\s\S]*?,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,]+)\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,]+)\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,]+)\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,]+)\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,)]+)\s*\)/g;

    let match: RegExpExecArray | null = null;
    while ((match = hoverPattern.exec(hoversSource))) {
      const elementId = match[1].trim().replace(/^['"]|['"]$/g, "");
      const appId = match[2].trim().replace(/^['"]|['"]$/g, "");
      const contextId = match[3].trim().replace(/^['"]|['"]$/g, "");
      const assetId = match[4].trim().replace(/^['"]|['"]$/g, "");
      const amount = match[5].trim().replace(/^['"]|['"]$/g, "");

      if (!elementId || !assetId) {
        continue;
      }

      hoverLookup[elementId] = { appId, contextId, assetId, amount };
    }

    return hoverLookup;
  }

  function deepFindAssetByName(tree: unknown, targetName: string): Record<string, unknown> | null {
    if (!tree || typeof tree !== "object") {
      return null;
    }

    const candidate = tree as Record<string, unknown>;
    if (candidate.name === targetName) {
      return candidate;
    }

    for (const value of Object.values(candidate)) {
      if (value && typeof value === "object") {
        const found = deepFindAssetByName(value, targetName);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  function resolveHistoryAssetRecord(
    row: HTMLElement,
    hoverLookup: Record<string, HoverAssetLookup>,
    assetsPayload: Record<string, unknown> | undefined,
    fallbackName: string
  ): Record<string, unknown> | null {
    if (!assetsPayload) {
      return null;
    }

    const idSource =
      row.querySelector<HTMLElement>("span.market_listing_item_name[id]") ??
      row.querySelector<HTMLElement>("img.market_listing_item_img[id]") ??
      null;
    const hoverId = idSource?.id ?? "";
    const hoverAsset = hoverLookup[hoverId];

    if (hoverAsset) {
      const appAssets = assetsPayload[hoverAsset.appId];
      if (appAssets && typeof appAssets === "object") {
        const contextAssets = (appAssets as Record<string, unknown>)[hoverAsset.contextId];
        if (contextAssets && typeof contextAssets === "object") {
          const byAssetId = (contextAssets as Record<string, unknown>)[hoverAsset.assetId];
          if (byAssetId && typeof byAssetId === "object") {
            return byAssetId as Record<string, unknown>;
          }
        }
      }
    }

    return deepFindAssetByName(assetsPayload, fallbackName);
  }

  function buildMarketHistoryImportTargets(
    appId: string,
    hoverAsset: HoverAssetLookup | undefined,
    assetRecord: Record<string, unknown> | null
  ): MarketHistoryImportTarget[] {
    const targets = new Map<string, MarketHistoryImportTarget>();

    const addTarget = (contextId: string | null | undefined, assetId: string | null | undefined): void => {
      if (!contextId || !assetId) {
        return;
      }

      const key = buildAssetKey(appId, contextId, assetId);
      if (!targets.has(key)) {
        targets.set(key, { key, contextId, assetId });
      }
    };

    addTarget(hoverAsset?.contextId ?? null, hoverAsset?.assetId ?? null);

    const assetContextId =
      typeof assetRecord?.contextid === "string"
        ? assetRecord.contextid
        : typeof assetRecord?.contextid === "number"
          ? String(assetRecord.contextid)
          : null;
    const assetId =
      typeof assetRecord?.id === "string"
        ? assetRecord.id
        : typeof assetRecord?.id === "number"
          ? String(assetRecord.id)
          : typeof assetRecord?.assetid === "string"
            ? assetRecord.assetid
            : typeof assetRecord?.assetid === "number"
              ? String(assetRecord.assetid)
              : null;
    const unownedContextId =
      typeof assetRecord?.unowned_contextid === "string"
        ? assetRecord.unowned_contextid
        : typeof assetRecord?.unowned_contextid === "number"
          ? String(assetRecord.unowned_contextid)
          : null;
    const unownedAssetId =
      typeof assetRecord?.unowned_id === "string"
        ? assetRecord.unowned_id
        : typeof assetRecord?.unowned_id === "number"
          ? String(assetRecord.unowned_id)
          : null;

    addTarget(assetContextId, assetId);
    addTarget(unownedContextId, unownedAssetId);

    return Array.from(targets.values());
  }

  function getHistoryRowHoverId(row: HTMLElement): string {
    const idSource =
      row.querySelector<HTMLElement>("span.market_listing_item_name[id]") ??
      row.querySelector<HTMLElement>("img.market_listing_item_img[id]") ??
      row.querySelector<HTMLElement>("[id]") ??
      null;

    return idSource?.id ?? "";
  }

  function parseMarketHistoryRows(payload: MarketHistoryResponse): MarketHistoryImportCandidate[] {
    const resultsHtml = payload.results_html ?? "";
    const documentFragment = new DOMParser().parseFromString(`<div>${resultsHtml}</div>`, "text/html");
    const rows = Array.from(
      documentFragment.querySelectorAll<HTMLElement>(".market_recent_listing_row, .market_listing_row")
    );
    const hoverLookup = parseHoverAssetLookupMap(payload.hovers ?? "");
    const imports: MarketHistoryImportCandidate[] = [];

    for (const row of rows) {
      const gainOrLoss = row.querySelector<HTMLElement>(".market_listing_gainorloss")?.textContent?.trim();
      if (gainOrLoss !== "+" && gainOrLoss !== "-") {
        continue;
      }

      const transactionType = gainOrLoss === "+" ? "buy" : "sell";

      const listingUrl = extractListingUrl(row);
      const listingContext = listingUrl ? parseListingUrl(listingUrl) : null;
      const priceText = row.querySelector<HTMLElement>(".market_listing_price")?.textContent?.trim() ?? "";
      const parsedPrice = parseMoney(priceText);

      if (transactionType === "buy" && parsedPrice.amount === null) {
        continue;
      }

      const fallbackName = listingContext?.marketHashName ?? UI.unknownItem;
      const displayName = extractDisplayName(row, fallbackName);
      const appName = extractAppName(row, displayName, "");
      const assetRecord = resolveHistoryAssetRecord(row, hoverLookup, payload.assets, displayName);
      const hoverId = getHistoryRowHoverId(row);
      const hoverAsset = hoverLookup[hoverId];
      const appId =
        typeof assetRecord?.appid === "string"
          ? assetRecord.appid
          : typeof assetRecord?.appid === "number"
            ? String(assetRecord.appid)
            : listingContext?.appId ?? hoverAsset?.appId ?? null;
      const marketHashName =
        typeof assetRecord?.market_hash_name === "string"
          ? assetRecord.market_hash_name
          : listingContext?.marketHashName ?? displayName;

      if (!appId) {
        continue;
      }

      const targets = buildMarketHistoryImportTargets(appId, hoverAsset, assetRecord);
      if (targets.length === 0) {
        continue;
      }

      const primaryTarget = targets[0];

      const resolvedListingUrl =
        listingUrl ||
        listingContext?.listingUrl ||
        `https://steamcommunity.com/market/listings/${encodeURIComponent(appId)}/${encodeURIComponent(marketHashName)}`;

      imports.push({
        key: primaryTarget.key,
        sourceKey: primaryTarget.key,
        transactionType,
        appId,
        appName,
        displayName,
        marketHashName,
        listingUrl: resolvedListingUrl,
        customCost: parsedPrice.amount ?? 0,
        currencySymbol: parsedPrice.currencySymbol,
        assetId: primaryTarget.assetId,
        contextId: primaryTarget.contextId,
        alternateTargets: targets.slice(1)
      });
    }

    return imports;
  }

  async function fetchMarketHistoryPage(start: number): Promise<MarketHistoryResponse> {
    const endpoint =
      `https://steamcommunity.com/market/myhistory/render/?query=&count=${MARKET_HISTORY_PAGE_SIZE}` +
      `&start=${start}`;
    const response = await fetch(endpoint, { credentials: "include" });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as MarketHistoryResponse;
    if (!payload.success) {
      throw new Error("Steam did not return market history.");
    }

    return payload;
  }

  async function runMarketHistorySync(): Promise<MarketHistorySyncResult> {
    const manualRecords = await loadManualRecords();
    const nextImportedRecords: Record<string, TrackedItemRecord> = {};
    const allTransactions: MarketHistoryImportCandidate[] = [];
    let start = 0;
    let totalCount = 0;

    do {
      const payload = await fetchMarketHistoryPage(start);
      const imports = parseMarketHistoryRows(payload);
      allTransactions.push(...imports);
      totalCount = payload.total_count ?? imports.length;

      const pageSize = payload.pagesize ?? imports.length;
      if (pageSize <= 0) {
        break;
      }

      start += pageSize;
    } while (start < totalCount);

    for (const candidate of allTransactions.reverse()) {
      if (candidate.transactionType === "sell") {
        reconcileMarketHistorySale(candidate, nextImportedRecords);
        continue;
      }

      const targets = [
        {
          key: candidate.key,
          assetId: candidate.assetId,
          contextId: candidate.contextId
        },
        ...candidate.alternateTargets
      ];

      for (const target of targets) {
        if (manualRecords[target.key]) {
          continue;
        }

        const existingImportedRecord = nextImportedRecords[target.key];
        nextImportedRecords[target.key] = createImportedRecord(candidate, existingImportedRecord, target);
      }
    }

    await saveImportedRecords(nextImportedRecords);

    const syncedSourceKeys = new Set(
      Object.values(nextImportedRecords).map((record) => record.sourceKey ?? record.key)
    );

    return {
      importedCount: syncedSourceKeys.size,
      importedKeys: Object.keys(nextImportedRecords)
    };
  }

  function syncMarketHistory(): Promise<MarketHistorySyncResult> {
    if (!marketHistorySyncPromise) {
      marketHistorySyncPromise = runMarketHistorySync().finally(() => {
        marketHistorySyncPromise = null;
      });
    }

    return marketHistorySyncPromise;
  }

  function maybeAutoSyncMarketHistory(
    context: ItemContext,
    record: TrackedItemRecord | undefined,
    panel: HTMLDivElement
  ): void {
    if (autoMarketHistorySyncStarted || marketHistorySyncPromise || record || !context.assetId) {
      return;
    }

    if (!window.location.pathname.includes("/inventory")) {
      return;
    }

    autoMarketHistorySyncStarted = true;
    const statusElement = panel.querySelector<HTMLElement>(".steam-upup-panel__status");
    if (statusElement) {
      statusElement.textContent = UI.syncingHistory;
    }

    void syncMarketHistory()
      .then((result) => {
        const matchedCurrentItem = result.importedKeys.includes(context.key);
        void renderContext(context, formatMarketHistorySyncSuccess(result.importedCount, matchedCurrentItem));
        scheduleScan();
      })
      .catch((error) => {
        const nextStatus = formatMarketHistorySyncError(error);
        const nextStatusElement = panel.querySelector<HTMLElement>(".steam-upup-panel__status");
        if (nextStatusElement) {
          nextStatusElement.textContent = nextStatus;
        }
      });
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pnlClassName(value: number | null): string {
    if (value === null) {
      return "steam-upup-panel__value";
    }

    if (value > 0) {
      return "steam-upup-panel__value steam-upup-panel__value--positive";
    }

    if (value < 0) {
      return "steam-upup-panel__value steam-upup-panel__value--negative";
    }

    return "steam-upup-panel__value";
  }

  function panelIsBusy(panel: HTMLElement | null): boolean {
    const activeElement = document.activeElement;
    return !!panel && (panel.dataset.dragging === "true" || (!!activeElement && panel.contains(activeElement)));
  }

  function mutationTouchesPanel(mutation: MutationRecord): boolean {
    const targetNode = mutation.target instanceof HTMLElement ? mutation.target : mutation.target.parentElement;
    if (targetNode?.closest(`.${PANEL_CLASS}, .${INVENTORY_TOTALS_CLASS}`)) {
      return true;
    }

    const touchedNodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];

    return touchedNodes.some((node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }

      return (
        node.classList.contains(PANEL_CLASS) ||
        node.classList.contains(INVENTORY_TOTALS_CLASS) ||
        !!node.closest(`.${PANEL_CLASS}, .${INVENTORY_TOTALS_CLASS}`)
      );
    });
  }

  function ensurePanel(
    mountElement: HTMLElement,
    key: string,
    placement: "append" | "prepend",
    layout: "default" | "inventory-left-floating"
  ): HTMLDivElement {
    let panel = mountElement.querySelector<HTMLDivElement>(`.${PANEL_CLASS}`);

    if (!panel) {
      panel = document.createElement("div");
      panel.className = PANEL_CLASS;
      if (placement === "prepend") {
        mountElement.prepend(panel);
      } else {
        mountElement.appendChild(panel);
      }
    }

    panel.dataset.recordKey = key;
    panel.dataset.positionKey = layout === "inventory-left-floating" ? "inventory-left-floating" : "";
    panel.classList.toggle("steam-upup-panel--inventory-left-floating", layout === "inventory-left-floating");
    mountElement.classList.toggle("steam-upup-inventory-anchor", layout === "inventory-left-floating");
    return panel;
  }

  function getPanelPositionKey(context: ItemContext): string | null {
    if (context.layout === "inventory-left-floating") {
      return "inventory-left-floating";
    }

    return null;
  }

  function clampPanelPosition(x: number, y: number, width: number, height: number): PanelPosition {
    const spacing = 16;
    const maxX = Math.max(spacing, window.innerWidth - width - spacing);
    const maxY = Math.max(spacing, window.innerHeight - height - spacing);

    return {
      x: Math.min(Math.max(spacing, x), maxX),
      y: Math.min(Math.max(spacing, y), maxY)
    };
  }

  function formatPercent(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return UI.unavailable;
    }

    const percentage = value * 100;
    const formatted = percentage.toLocaleString(UI_CONTEXT.numberLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    return `${formatted}%`;
  }

  function applyPanelLayout(
    panel: HTMLDivElement,
    context: ItemContext,
    savedPosition: PanelPosition | undefined
  ): void {
    if (context.layout !== "inventory-left-floating") {
      panel.style.position = "";
      panel.style.top = "";
      panel.style.left = "";
      panel.style.width = "";
      return;
    }

    if (panel.dataset.dragging === "true") {
      return;
    }

    const desiredWidth = Math.min(320, Math.max(272, Math.floor(window.innerWidth * 0.23)));
    const spacing = 16;

    panel.style.width = `${desiredWidth}px`;
    panel.style.position = "fixed";

    const mountRect = context.mountElement.getBoundingClientRect();
    const panelHeight = panel.getBoundingClientRect().height || 640;
    const fallbackPosition = clampPanelPosition(mountRect.left - desiredWidth - spacing, mountRect.top, desiredWidth, panelHeight);
    const position = savedPosition
      ? clampPanelPosition(savedPosition.x, savedPosition.y, desiredWidth, panelHeight)
      : fallbackPosition;

    panel.style.left = `${Math.round(position.x)}px`;
    panel.style.top = `${Math.round(position.y)}px`;
  }

  function refreshFloatingPanelLayouts(): void {
    const panels = Array.from(document.querySelectorAll<HTMLDivElement>(`.${PANEL_CLASS}--inventory-left-floating`));

    for (const panel of panels) {
      if (panel.dataset.dragging === "true") {
        continue;
      }

      const mountElement = panel.parentElement;
      if (!(mountElement instanceof HTMLElement)) {
        continue;
      }

      const positionKey = panel.dataset.positionKey ?? "";
      applyPanelLayout(
        panel,
        {
          key: panel.dataset.recordKey ?? "",
          appId: "",
          appName: "",
          displayName: "",
          marketHashName: "",
          listingUrl: "",
          mountElement,
          placement: "prepend",
          layout: "inventory-left-floating"
        },
        positionKey ? panelPositionCache[positionKey] : undefined
      );
    }
  }

  function scheduleLayoutRefresh(): void {
    if (layoutRefreshScheduled || isContextInvalidated) {
      return;
    }

    layoutRefreshScheduled = true;
    window.requestAnimationFrame(() => {
      layoutRefreshScheduled = false;
      refreshFloatingPanelLayouts();
    });
  }

  function normalizeTrackedQuantity(quantity: number | undefined): number {
    return Number.isFinite(quantity) && typeof quantity === "number" && quantity > 0 ? Math.floor(quantity) : 1;
  }

  function normalizeInventoryGameLabel(label: string): string {
    return label.replace(/\(\s*\d+\s*\)\s*$/, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function parseInventoryTabAppId(tab: HTMLElement): string {
    const candidates = [tab.id, tab.getAttribute("href") ?? "", tab.dataset.appid ?? ""];

    for (const candidate of candidates) {
      const match = candidate.match(/(\d{2,10})/);
      if (match) {
        return match[1];
      }
    }

    return "";
  }

  function resolveActiveInventorySelection(): ActiveInventorySelection | null {
    const activeTab =
      document.querySelector<HTMLElement>(".games_list_tab.active") ??
      (window.location.hash
        ? document.querySelector<HTMLElement>(`.games_list_tab[href="${CSS.escape(window.location.hash)}"]`)
        : null);

    if (activeTab) {
      const appId = parseInventoryTabAppId(activeTab);
      const appName =
        activeTab.querySelector<HTMLElement>(".games_list_tab_name")?.textContent?.trim() ??
        activeTab.textContent?.trim() ??
        "";

      if (appId) {
        return {
          appId,
          appName
        };
      }
    }

    const selectedAsset = resolveSelectedInventoryAsset();
    if (selectedAsset?.appId) {
      const matchingTab = document.querySelector<HTMLElement>(`#inventory_link_${CSS.escape(selectedAsset.appId)}`);
      const appName =
        matchingTab?.querySelector<HTMLElement>(".games_list_tab_name")?.textContent?.trim() ??
        "";

      return {
        appId: selectedAsset.appId,
        appName
      };
    }

    return null;
  }

  function getInventoryTotalsRecordScore(record: TrackedItemRecord): number {
    let score = record.source === "manual" ? 100 : 0;

    if (record.appId) {
      score += 10;
    }

    if (record.marketHashName) {
      score += 10;
    }

    if (record.listingUrl) {
      score += 5;
    }

    if (record.assetId && record.contextId) {
      score += 1;
    }

    return score;
  }

  function selectPreferredInventoryTotalsRecord(
    existing: TrackedItemRecord | undefined,
    candidate: TrackedItemRecord
  ): TrackedItemRecord {
    if (!existing) {
      return candidate;
    }

    const existingScore = getInventoryTotalsRecordScore(existing);
    const candidateScore = getInventoryTotalsRecordScore(candidate);

    if (candidateScore !== existingScore) {
      return candidateScore > existingScore ? candidate : existing;
    }

    return candidate.updatedAt.localeCompare(existing.updatedAt) > 0 ? candidate : existing;
  }

  function createInventoryTotalsContext(record: TrackedItemRecord): ItemContext | null {
    const parsedListing = record.listingUrl ? parseListingUrl(record.listingUrl) : null;
    const appId = record.appId || parsedListing?.appId || "";
    const marketHashName = record.marketHashName || parsedListing?.marketHashName || record.displayName;

    if (!appId || !marketHashName) {
      return null;
    }

    return {
      key: buildMarketKey(appId, marketHashName),
      appId,
      appName: record.appName || UI.genericSteamItem,
      displayName: record.displayName || marketHashName,
      marketHashName,
      listingUrl: record.listingUrl || parsedListing?.listingUrl || "",
      mountElement: document.body,
      placement: "append",
      layout: "default"
    };
  }

  function resolveInventoryTotalsRecords(
    manualRecords: Record<string, TrackedItemRecord>,
    importedRecords: Record<string, TrackedItemRecord>
  ): TrackedItemRecord[] {
    const dedupedRecords = new Map<string, TrackedItemRecord>();
    const records = [...Object.values(importedRecords), ...Object.values(manualRecords)];

    for (const record of records) {
      if (!Number.isFinite(record.customCost) || record.customCost < 0) {
        continue;
      }

      const normalizedRecord: TrackedItemRecord = {
        ...record,
        quantity: normalizeTrackedQuantity(record.quantity),
        customCost: Math.max(0, record.customCost),
        feeRate: SteamUpupShared.normalizeFeeRate(record.feeRate ?? 0.15)
      };

      const dedupeKey = normalizedRecord.sourceKey ?? normalizedRecord.key;
      const existingRecord = dedupedRecords.get(dedupeKey);
      dedupedRecords.set(dedupeKey, selectPreferredInventoryTotalsRecord(existingRecord, normalizedRecord));
    }

    return Array.from(dedupedRecords.values());
  }

  function recordMatchesActiveInventory(record: TrackedItemRecord, activeInventory: ActiveInventorySelection): boolean {
    const parsedListing = record.listingUrl ? parseListingUrl(record.listingUrl) : null;
    const resolvedAppId = record.appId || parsedListing?.appId || "";
    if (resolvedAppId && resolvedAppId === activeInventory.appId) {
      return true;
    }

    if (!activeInventory.appName) {
      return false;
    }

    return normalizeInventoryGameLabel(record.appName) === normalizeInventoryGameLabel(activeInventory.appName);
  }

  function resolveInventoryGameOrder(): Map<string, number> {
    const gameOrder = new Map<string, number>();
    const tabs = Array.from(document.querySelectorAll<HTMLElement>(".games_list_tab")).filter(isVisible);

    tabs.forEach((tab, index) => {
      const normalizedLabel = normalizeInventoryGameLabel(tab.textContent ?? "");
      if (normalizedLabel && !gameOrder.has(normalizedLabel)) {
        gameOrder.set(normalizedLabel, index);
      }
    });

    return gameOrder;
  }

  async function buildInventoryTotalsGroups(records: TrackedItemRecord[]): Promise<InventoryTotalsGroup[]> {
    if (records.length === 0) {
      return [];
    }

    const entries: InventoryTotalsRecordContext[] = [];
    const uniqueContexts = new Map<string, ItemContext>();

    for (const record of records) {
      const context = createInventoryTotalsContext(record);
      if (!context) {
        continue;
      }

      const entry: InventoryTotalsRecordContext = {
        record,
        context,
        appName: record.appName || context.appName || UI.genericSteamItem,
        quantity: normalizeTrackedQuantity(record.quantity)
      };

      entries.push(entry);

      const cacheKey = getPriceCacheKey(context);
      if (!uniqueContexts.has(cacheKey)) {
        uniqueContexts.set(cacheKey, context);
      }
    }

    if (entries.length === 0) {
      return [];
    }

    const priceSnapshots = new Map(
      await Promise.all(
        Array.from(uniqueContexts.entries()).map(async ([cacheKey, context]) => {
          return [cacheKey, await fetchPriceSnapshot(context)] as const;
        })
      )
    );

    const gameOrder = resolveInventoryGameOrder();
    const groupedTotals = new Map<string, InventoryTotalsAccumulator>();

    for (const entry of entries) {
      const { record, context, appName, quantity } = entry;
      const groupKey = context.appId || normalizeInventoryGameLabel(appName);
      const normalizedAppName = normalizeInventoryGameLabel(appName);
      const snapshot = priceSnapshots.get(getPriceCacheKey(context)) ?? null;
      const currencySymbol = snapshot?.currencySymbol || record.currencySymbol || UI_CONTEXT.fallbackCurrencySymbol;
      let accumulator = groupedTotals.get(groupKey);

      if (!accumulator) {
        accumulator = {
          appId: context.appId,
          appName,
          trackedItemsCount: 0,
          totalQuantity: 0,
          totalCost: 0,
          pricedQuantity: 0,
          pricedCost: 0,
          missingPriceQuantity: 0,
          totalNetValue: 0,
          pricingUnavailable: false,
          currencySymbol,
          sortIndex: gameOrder.get(normalizedAppName) ?? Number.MAX_SAFE_INTEGER
        };
        groupedTotals.set(groupKey, accumulator);
      }

      accumulator.trackedItemsCount += 1;
      accumulator.totalQuantity += quantity;
      accumulator.totalCost += record.customCost * quantity;

      if (!snapshot) {
        accumulator.pricingUnavailable = true;
        accumulator.missingPriceQuantity += quantity;
        continue;
      }

      accumulator.currencySymbol = snapshot.currencySymbol || accumulator.currencySymbol;
      const feeModel = buildFallbackFeeModel(record.feeRate);
      const estimatedNet = estimateNet(snapshot.grossPrice, accumulator.currencySymbol, feeModel);
      accumulator.pricedQuantity += quantity;
      accumulator.pricedCost += record.customCost * quantity;
      accumulator.totalNetValue += estimatedNet * quantity;
    }

    return Array.from(groupedTotals.values())
      .sort((left, right) => {
        if (left.sortIndex !== right.sortIndex) {
          return left.sortIndex - right.sortIndex;
        }

        if (Math.abs(right.totalCost - left.totalCost) > 0.0001) {
          return right.totalCost - left.totalCost;
        }

        return left.appName.localeCompare(right.appName, UI_CONTEXT.numberLocale);
      })
      .map((group) => {
        const totalNetValue = group.pricedQuantity > 0 ? group.totalNetValue : null;
        const totalReturnRate =
          totalNetValue !== null && group.pricedCost > 0 ? (totalNetValue - group.pricedCost) / group.pricedCost : null;

        return {
          appId: group.appId,
          appName: group.appName,
          trackedItemsCount: group.trackedItemsCount,
          totalQuantity: group.totalQuantity,
          totalCost: group.totalCost,
          pricedQuantity: group.pricedQuantity,
          pricedCost: group.pricedCost,
          missingPriceQuantity: group.missingPriceQuantity,
          totalNetValue,
          totalReturnRate,
          pricingUnavailable: group.pricingUnavailable,
          currencySymbol: group.currencySymbol
        };
      });
  }

  function resolveInventoryTotalsMountTarget(): InventoryTotalsMountTarget | null {
    const tabItemsContainer = document.querySelector<HTMLElement>(".tabitems_ctn");
    if (tabItemsContainer?.parentElement) {
      return {
        parent: tabItemsContainer.parentElement,
        before: tabItemsContainer.nextSibling
      };
    }

    const controlsAnchor =
      document.querySelector<HTMLElement>("#inventory_pagecontrols") ??
      document.querySelector<HTMLElement>(".filter_ctn.inventory_filters") ??
      document.querySelector<HTMLElement>("#inventories") ??
      document.querySelector<HTMLElement>(".inventory_ctn");

    if (controlsAnchor?.parentElement) {
      return {
        parent: controlsAnchor.parentElement,
        before: controlsAnchor
      };
    }

    const lastGamesTabs = Array.from(document.querySelectorAll<HTMLElement>(".games_list_tabs")).filter(isVisible).at(-1);
    if (lastGamesTabs?.parentElement) {
      return {
        parent: lastGamesTabs.parentElement,
        before: lastGamesTabs.nextSibling
      };
    }

    return null;
  }

  function removeInventoryTotalsSection(): void {
    document.querySelectorAll<HTMLElement>(`.${INVENTORY_TOTALS_CLASS}`).forEach((element) => element.remove());
  }

  function ensureInventoryTotalsSection(target: InventoryTotalsMountTarget): HTMLDivElement {
    let section = document.querySelector<HTMLDivElement>(`.${INVENTORY_TOTALS_CLASS}`);

    if (!section) {
      section = document.createElement("div");
      section.className = INVENTORY_TOTALS_CLASS;
    }

    target.parent.insertBefore(section, target.before);
    return section;
  }

  function renderInventoryTotalsMetric(label: string, valueMarkup: string, secondaryText = ""): string {
    const secondary = secondaryText
      ? `<div class="steam-upup-inventory-totals__secondary">${escapeHtml(secondaryText)}</div>`
      : "";

    return `
      <div class="steam-upup-inventory-totals__metric">
        <div class="steam-upup-inventory-totals__label">${escapeHtml(label)}</div>
        ${valueMarkup}
        ${secondary}
      </div>
    `;
  }

  function renderInventoryTotalsEmptyState(message: string): string {
    return `<div class="steam-upup-inventory-totals__empty">${escapeHtml(message)}</div>`;
  }

  function formatInventoryTotalsMissingPriceText(missingQuantity: number): string {
    if (missingQuantity <= 0) {
      return "";
    }

    if (UI_CONTEXT.locale === "zh-TW") {
      return `已排除 ${missingQuantity} 件無法取得目前價格的物品`;
    }

    return `Excluded ${missingQuantity} item${missingQuantity === 1 ? "" : "s"} with missing pricing`;
  }

  function formatInventoryTotalsRatioScopeText(pricedQuantity: number, totalQuantity: number): string {
    if (pricedQuantity <= 0 || pricedQuantity >= totalQuantity) {
      return "";
    }

    if (UI_CONTEXT.locale === "zh-TW") {
      return `損益比僅依可取得價格的 ${pricedQuantity} 件計算`;
    }

    return `Ratio is based on ${pricedQuantity} priced item${pricedQuantity === 1 ? "" : "s"}`;
  }

  function renderInventoryTotalsCard(group: InventoryTotalsGroup): string {
    const trackedCountText = SteamUpupShared.formatTrackedItemsCount(group.totalQuantity, UI_CONTEXT.locale);
    const missingPriceText = formatInventoryTotalsMissingPriceText(group.missingPriceQuantity);
    const ratioScopeText = formatInventoryTotalsRatioScopeText(group.pricedQuantity, group.totalQuantity);

    return `
      <article class="steam-upup-inventory-totals__card">
        <div class="steam-upup-inventory-totals__card-header">
          <div>
            <h4 class="steam-upup-inventory-totals__card-title">${escapeHtml(group.appName)}</h4>
            <div class="steam-upup-inventory-totals__card-meta">${escapeHtml(trackedCountText)}</div>
          </div>
        </div>
        <div class="steam-upup-inventory-totals__metrics">
          ${renderInventoryTotalsMetric(
            UI.inventoryTotalCost,
            `<div class="steam-upup-inventory-totals__value">${escapeHtml(formatMoney(group.totalCost, group.currencySymbol))}</div>`
          )}
          ${renderInventoryTotalsMetric(
            UI.inventoryTotalNetValue,
            `<div class="steam-upup-inventory-totals__value">${escapeHtml(formatMoney(group.totalNetValue, group.currencySymbol))}</div>`,
            missingPriceText || (group.pricingUnavailable ? UI.inventoryTotalsPricingUnavailable : "")
          )}
          ${renderInventoryTotalsMetric(
            UI.inventoryPnlRatio,
            `<div class="${pnlClassName(group.totalReturnRate)}">${escapeHtml(formatPercent(group.totalReturnRate))}</div>`,
            ratioScopeText || (group.pricingUnavailable && group.totalReturnRate === null ? missingPriceText : "")
          )}
        </div>
      </article>
    `;
  }

  function renderInventoryTotalsSectionShell(content: string): string {
    return `
      <div class="steam-upup-inventory-totals__header">
        <div class="steam-upup-inventory-totals__eyebrow">Steam Inventory PnL</div>
        <h3 class="steam-upup-inventory-totals__title">${escapeHtml(UI.inventoryTotalsTitle)}</h3>
        <div class="steam-upup-inventory-totals__intro">${escapeHtml(UI.inventoryTotalsIntro)}</div>
      </div>
      <div class="steam-upup-inventory-totals__list">
        ${content}
      </div>
    `;
  }

  async function renderInventoryTotalsSection(): Promise<void> {
    if (isContextInvalidated) {
      return;
    }

    if (!window.location.pathname.includes("/inventory")) {
      removeInventoryTotalsSection();
      return;
    }

    const target = resolveInventoryTotalsMountTarget();
    if (!target) {
      removeInventoryTotalsSection();
      return;
    }

    const section = ensureInventoryTotalsSection(target);
    const renderSequence = ++inventoryTotalsRenderSequence;
    scheduleLayoutRefresh();

    if (section.dataset.ready !== "true") {
      section.innerHTML = renderInventoryTotalsSectionShell(renderInventoryTotalsEmptyState(UI.inventoryTotalsLoading));
      scheduleLayoutRefresh();
    }

    const [manualRecords, importedRecords] = await Promise.all([loadManualRecords(), loadImportedRecords()]);
    if (isContextInvalidated || renderSequence !== inventoryTotalsRenderSequence) {
      return;
    }

    const activeInventory = resolveActiveInventorySelection();
    const trackedRecords = resolveInventoryTotalsRecords(manualRecords, importedRecords).filter((record) =>
      activeInventory ? recordMatchesActiveInventory(record, activeInventory) : false
    );
    const groups = await buildInventoryTotalsGroups(trackedRecords);
    if (isContextInvalidated || renderSequence !== inventoryTotalsRenderSequence) {
      return;
    }

    section.innerHTML = renderInventoryTotalsSectionShell(
      groups.length > 0
        ? groups.map((group) => renderInventoryTotalsCard(group)).join("")
        : renderInventoryTotalsEmptyState(UI.inventoryTotalsEmpty)
    );
    section.dataset.ready = "true";
    scheduleLayoutRefresh();
  }

  function createMetric(label: string, valueMarkup: string, secondaryText = ""): string {
    const secondary = secondaryText
      ? `<div class="steam-upup-panel__secondary">${escapeHtml(secondaryText)}</div>`
      : "";

    return `
      <div class="steam-upup-panel__metric">
        <div class="steam-upup-panel__label">${escapeHtml(label)}</div>
        ${valueMarkup}
        ${secondary}
      </div>
    `;
  }

  function resolveCaseOpeningPreset(currencySymbol: string): { amount: number; currencySymbol: string } | null {
    const amount = CASE_OPENING_COST_BY_LOCALE[UI_CONTEXT.locale];
    if (typeof amount !== "number") {
      return null;
    }

    return {
      amount,
      currencySymbol
    };
  }

  function formatPresetAppliedStatus(kind: PresetCostBasisKind, amount: number, currencySymbol: string): string {
    const formattedCost = formatMoney(amount, currencySymbol);

    if (UI_CONTEXT.locale === "zh-TW") {
      return kind === "case-opening"
        ? `\u5df2\u5957\u7528\u7bb1\u5b50\u958b\u51fa\u6210\u672c ${formattedCost}\u3002`
        : `\u5df2\u5957\u7528\u6bcf\u9031\u6389\u843d\u6210\u672c ${formattedCost}\u3002`;
    }

    return kind === "case-opening"
      ? `Applied case-opening cost ${formattedCost}.`
      : `Applied weekly-drop cost ${formattedCost}.`;
  }

  function getCostBasisLabel(costBasisKind: CostBasisKind): string {
    switch (costBasisKind) {
      case "case-opening":
        return UI.caseOpeningCost;
      case "weekly-drop":
        return UI.weeklyDropCost;
      case "manual":
      default:
        return UI.customCost;
    }
  }

  function getCostBasisSourceText(costBasisKind: CostBasisKind): string {
    switch (costBasisKind) {
      case "case-opening":
        return UI.basedOnCaseOpeningCost;
      case "weekly-drop":
        return UI.basedOnWeeklyDropCost;
      case "manual":
      default:
        return UI.basedOnCustomCost;
    }
  }

  function getSavedStatusForCostBasis(costBasisKind: CostBasisKind, variant: "default" | "submitted"): string {
    switch (costBasisKind) {
      case "case-opening":
        return UI.savedCaseOpeningCost;
      case "weekly-drop":
        return UI.savedWeeklyDropCost;
      case "manual":
      default:
        return variant === "default" ? UI.savedInBrowser : UI.savedOverride;
    }
  }

  function getInvalidStatusForCostBasis(costBasisKind: CostBasisKind): string {
    switch (costBasisKind) {
      case "case-opening":
        return UI.invalidCaseOpeningCost;
      case "weekly-drop":
        return UI.invalidWeeklyDropCost;
      case "manual":
      default:
        return UI.invalidCustomCost;
    }
  }

  function resolveCostBasisKind(record: TrackedItemRecord | undefined, submittedKind?: string): CostBasisKind {
    if (submittedKind === "case-opening" || submittedKind === "weekly-drop") {
      return submittedKind;
    }

    if (record?.costBasisKind === "case-opening" || record?.costBasisKind === "weekly-drop") {
      return record.costBasisKind;
    }

    return "manual";
  }

  function renderPanelHtml(
    context: ItemContext,
    record: TrackedItemRecord | undefined,
    priceSnapshot: PriceSnapshot | null,
    pricingMetrics: PanelPricingMetrics,
    statusMessage: string
  ): string {
    const quantity = record?.quantity ?? 1;
    const customCost = record?.customCost ?? 0;
    const currencySymbol = record?.currencySymbol ?? priceSnapshot?.currencySymbol ?? UI_CONTEXT.fallbackCurrencySymbol;
    const feeRate = pricingMetrics.feeRate;
    const estimatedNet = pricingMetrics.estimatedNet;
    const pnlPerUnit = estimatedNet === null || !record ? null : estimatedNet - customCost;
    const totalPnl = pnlPerUnit === null ? null : pnlPerUnit * quantity;
    const returnRate = record && customCost > 0 && pnlPerUnit !== null ? pnlPerUnit / customCost : null;
    const breakEvenGross = pricingMetrics.breakEvenGross;
    const costBasisKind = resolveCostBasisKind(record);
    const shouldShowReturnRate = costBasisKind !== "weekly-drop" && customCost > 0;
    const shouldShowBreakEvenGross = customCost > 0;
    const costLabel = getCostBasisLabel(costBasisKind);
    const costSourceText =
      record?.source === "market-history"
        ? UI.importedFromMarketHistory
        : getCostBasisSourceText(costBasisKind);
    const resolvedStatusMessage =
      statusMessage ||
      (record?.source === "market-history"
        ? UI.importedFromMarketHistory
        : getSavedStatusForCostBasis(costBasisKind, "default"));

    return `
      <div class="steam-upup-panel__header">
        <div>
          <div class="steam-upup-panel__eyebrow">Steam Inventory PnL</div>
          <h3 class="steam-upup-panel__title">${escapeHtml(UI.panelTitle)}</h3>
        </div>
        <div class="steam-upup-panel__badge">${record ? escapeHtml(UI.badgeTracked) : escapeHtml(UI.badgeNew)}</div>
      </div>
      <div class="steam-upup-panel__subhead">
        <div>${escapeHtml(context.displayName)}</div>
        <div>${escapeHtml(context.appName || UI.genericSteamItem)}</div>
      </div>
      <div class="steam-upup-panel__metrics">
        ${createMetric(
          UI.marketPrice,
          `<div class="steam-upup-panel__value">${escapeHtml(priceSnapshot?.grossText ?? UI.unavailable)}</div>`,
          priceSnapshot?.sourceLabel ?? UI.sourcePriceoverview
        )}
        ${createMetric(
          UI.estimatedNet,
          `<div class="steam-upup-panel__value">${escapeHtml(formatMoney(estimatedNet, currencySymbol))}</div>`,
          SteamUpupShared.formatFeeText(feeRate, UI_CONTEXT.locale)
        )}
        ${createMetric(
          UI.pnlPerUnit,
          `<div class="${pnlClassName(pnlPerUnit)}">${escapeHtml(formatMoney(pnlPerUnit, currencySymbol))}</div>`,
          costSourceText
        )}
        ${createMetric(
          UI.totalPnl,
          `<div class="${pnlClassName(totalPnl)}">${escapeHtml(formatMoney(totalPnl, currencySymbol))}</div>`,
          SteamUpupShared.formatUnitCount(quantity, UI_CONTEXT.locale)
        )}
        ${
          shouldShowReturnRate
            ? createMetric(
                UI.returnRate,
                `<div class="${pnlClassName(returnRate)}">${escapeHtml(formatPercent(returnRate))}</div>`,
                costSourceText
              )
            : ""
        }
        ${
          shouldShowBreakEvenGross
            ? createMetric(
                UI.breakEvenGross,
                `<div class="steam-upup-panel__value">${escapeHtml(formatMoney(breakEvenGross, currencySymbol))}</div>`,
                UI.approximateSalePriceTarget
              )
            : ""
        }
      </div>
      <form class="steam-upup-panel__form">
        <label>
          <span>${escapeHtml(costLabel)}</span>
          <input name="customCost" type="number" min="0" step="0.01" value="${record?.customCost ?? ""}" placeholder="0.00" />
        </label>
        <label>
          <span>${escapeHtml(UI.quantity)}</span>
          <input name="quantity" type="number" min="1" step="1" value="${record?.quantity ?? 1}" />
        </label>
        <label>
          <span>${escapeHtml(UI.feePercent)}</span>
          <input
            name="feeRate"
            type="number"
            min="0"
            max="95"
            step="0.1"
            value="${SteamUpupShared.formatFeeInputValue(feeRate)}"
          />
        </label>
        <label class="steam-upup-panel__wide">
          <span>${escapeHtml(UI.note)}</span>
          <input name="note" type="text" maxlength="120" value="${escapeHtml(record?.note ?? "")}" placeholder="${escapeHtml(UI.notePlaceholder)}" />
        </label>
        <div class="steam-upup-panel__actions">
          <button type="submit" class="steam-upup-panel__button steam-upup-panel__button--primary">${escapeHtml(UI.save)}</button>
          <button type="button" data-action="reset" class="steam-upup-panel__button">${escapeHtml(UI.reset)}</button>
          <button type="button" data-action="case-opened" class="steam-upup-panel__button">${escapeHtml(UI.caseOpenedPreset)}</button>
          <button type="button" data-action="weekly-drop" class="steam-upup-panel__button">${escapeHtml(UI.weeklyDropPreset)}</button>
          <button type="button" data-action="sync-history" class="steam-upup-panel__button">${escapeHtml(UI.syncHistory)}</button>
          ${
            context.listingUrl
              ? `<a class="steam-upup-panel__link" href="${escapeHtml(context.listingUrl)}" target="_blank" rel="noreferrer">${escapeHtml(UI.openListing)}</a>`
              : ""
          }
        </div>
      </form>
      <div class="steam-upup-panel__status">
        ${escapeHtml(resolvedStatusMessage)}
      </div>
    `;
  }

  function bindPanelEvents(
    panel: HTMLDivElement,
    context: ItemContext,
    record: TrackedItemRecord | undefined,
    priceSnapshot: PriceSnapshot | null
  ): void {
    const form = panel.querySelector<HTMLFormElement>("form");
    const customCostInput = panel.querySelector<HTMLInputElement>("input[name='customCost']");
    const resetButton = panel.querySelector<HTMLButtonElement>("[data-action='reset']");
    const caseOpenedButton = panel.querySelector<HTMLButtonElement>("[data-action='case-opened']");
    const weeklyDropButton = panel.querySelector<HTMLButtonElement>("[data-action='weekly-drop']");
    const syncButton = panel.querySelector<HTMLButtonElement>("[data-action='sync-history']");
    const statusElement = panel.querySelector<HTMLElement>(".steam-upup-panel__status");
    const dragHandle = panel.querySelector<HTMLElement>(".steam-upup-panel__header");
    const panelPositionKey = getPanelPositionKey(context);

    if (!form || !customCostInput || !resetButton || !caseOpenedButton || !weeklyDropButton || !syncButton || !statusElement || !dragHandle) {
      return;
    }

    panel.classList.toggle("steam-upup-panel--draggable", !!panelPositionKey);

    if (panel.dataset.shellBound !== "true") {
      panel.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      panel.addEventListener(
        "keydown",
        (event) => {
          event.stopPropagation();
        },
        true
      );

      panel.dataset.shellBound = "true";
    }

    form.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
      input.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });

      input.addEventListener(
        "keydown",
        (event) => {
          event.stopPropagation();
        },
        true
      );
    });

    if (panelPositionKey) {
      dragHandle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
          return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest("button, a, input")) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const panelRect = panel.getBoundingClientRect();
        const offsetX = event.clientX - panelRect.left;
        const offsetY = event.clientY - panelRect.top;
        panel.dataset.dragging = "true";
        document.body.classList.add("steam-upup-dragging");

        const onPointerMove = (moveEvent: PointerEvent) => {
          const nextPosition = clampPanelPosition(
            moveEvent.clientX - offsetX,
            moveEvent.clientY - offsetY,
            panelRect.width,
            panelRect.height
          );

          panelPositionCache[panelPositionKey] = nextPosition;
          panel.style.left = `${Math.round(nextPosition.x)}px`;
          panel.style.top = `${Math.round(nextPosition.y)}px`;
        };

        const onPointerUp = () => {
          panel.dataset.dragging = "false";
          document.body.classList.remove("steam-upup-dragging");
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);

          const finalRect = panel.getBoundingClientRect();
          panelPositionCache[panelPositionKey] = { x: finalRect.left, y: finalRect.top };
          void savePanelPosition(panelPositionKey, { x: finalRect.left, y: finalRect.top });
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const customCost = Number.parseFloat(String(formData.get("customCost") ?? ""));
      const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
      const rawFeePercent = Number.parseFloat(String(formData.get("feeRate") ?? "15"));
      const note = String(formData.get("note") ?? "").trim();
      const costBasisKind = resolveCostBasisKind(record, form.dataset.submitCostBasisKind);

      if (!Number.isFinite(customCost) || customCost < 0) {
        statusElement.textContent = getInvalidStatusForCostBasis(costBasisKind);
        return;
      }

      const clampedFeeRate = SteamUpupShared.normalizeFeeRate(Math.min(Math.max(rawFeePercent / 100, 0), 0.95));
      const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
      const currencySymbol =
        priceSnapshot?.currencySymbol ?? record?.currencySymbol ?? UI_CONTEXT.fallbackCurrencySymbol;
      const nextStatusMessage =
        form.dataset.submitStatus || getSavedStatusForCostBasis(costBasisKind, "submitted");
      delete form.dataset.submitStatus;
      delete form.dataset.submitCostBasisKind;

      const nextRecord: TrackedItemRecord = {
        key: context.key,
        appId: context.appId,
        appName: context.appName,
        displayName: context.displayName,
        marketHashName: context.marketHashName,
        listingUrl: context.listingUrl,
        quantity: normalizedQuantity,
        customCost,
        feeRate: clampedFeeRate,
        note,
        currencySymbol,
        updatedAt: new Date().toISOString(),
        source: "manual",
        costBasisKind,
        assetId: context.assetId,
        contextId: context.contextId,
        sourceKey: record?.sourceKey
      };

      void saveManualRecord(nextRecord).then(() => {
        void renderContext(context, nextStatusMessage);
        scheduleScan();
      });
    });

    resetButton.addEventListener("click", () => {
      const deleteKey = record?.key ?? context.key;
      const deleteRecordPromise =
        record?.source === "market-history" ? deleteImportedRecord(deleteKey) : deleteManualRecord(deleteKey);

      void deleteRecordPromise.then(() => {
        void renderContext(context, UI.removedOverride);
        scheduleScan();
      });
    });

    caseOpenedButton.addEventListener("click", () => {
      const currencySymbol =
        priceSnapshot?.currencySymbol ?? record?.currencySymbol ?? UI_CONTEXT.fallbackCurrencySymbol;
      const preset = resolveCaseOpeningPreset(currencySymbol);

      if (!preset) {
        statusElement.textContent = UI.caseOpeningCostUnavailable;
        return;
      }

      customCostInput.value = preset.amount.toString();
      form.dataset.submitCostBasisKind = "case-opening";
      form.dataset.submitStatus = formatPresetAppliedStatus("case-opening", preset.amount, preset.currencySymbol);
      form.requestSubmit();
    });

    weeklyDropButton.addEventListener("click", () => {
      const currencySymbol =
        priceSnapshot?.currencySymbol ?? record?.currencySymbol ?? UI_CONTEXT.fallbackCurrencySymbol;

      customCostInput.value = "0";
      form.dataset.submitCostBasisKind = "weekly-drop";
      form.dataset.submitStatus = formatPresetAppliedStatus("weekly-drop", 0, currencySymbol);
      form.requestSubmit();
    });

    syncButton.addEventListener("click", () => {
      syncButton.disabled = true;
      syncButton.textContent = UI.syncingHistory;
      statusElement.textContent = UI.syncingHistory;

      void syncMarketHistory()
        .then((result) => {
          const matchedCurrentItem = result.importedKeys.includes(context.key);
          void renderContext(context, matchedCurrentItem ? formatMarketHistorySyncSuccess(result.importedCount, matchedCurrentItem) : "");
          scheduleScan();
        })
        .catch((error) => {
          statusElement.textContent = formatMarketHistorySyncError(error);
          syncButton.disabled = false;
          syncButton.textContent = UI.syncHistory;
        });
    });
  }

  async function renderContext(context: ItemContext, statusMessage = ""): Promise<void> {
    if (isContextInvalidated) {
      return;
    }

    const existingPanel = context.mountElement.querySelector<HTMLDivElement>(`.${PANEL_CLASS}`);
    if (!statusMessage && panelIsBusy(existingPanel)) {
      return;
    }

    const [manualRecords, importedRecords, priceSnapshot] = await Promise.all([
      loadManualRecords(),
      loadImportedRecords(),
      fetchPriceSnapshot(context)
    ]);
    await ensurePanelPositionsLoaded();
    if (isContextInvalidated) {
      return;
    }

    const panel = ensurePanel(context.mountElement, context.key, context.placement, context.layout);
    const exactRecord = resolveRecordForContext(context, manualRecords, importedRecords);
    let record = exactRecord ?? resolveFallbackRecordForContext(context, manualRecords, importedRecords);

    if (!exactRecord && (!record || record.source === "market-history")) {
      const aliasedRecord = await aliasImportedRecordToContext(context, manualRecords, importedRecords);
      if (aliasedRecord) {
        importedRecords[context.key] = aliasedRecord;
        record = aliasedRecord;
        if (!statusMessage) {
          statusMessage = UI.aliasedFromMarketHistory;
        }
      }
    }

    const currencySymbol = record?.currencySymbol ?? priceSnapshot?.currencySymbol ?? UI_CONTEXT.fallbackCurrencySymbol;
    const pricingMetrics = await resolvePanelPricingMetrics(record, priceSnapshot, currencySymbol);

    panel.innerHTML = renderPanelHtml(context, record, priceSnapshot, pricingMetrics, statusMessage);
    bindPanelEvents(panel, context, record, priceSnapshot);
    const positionKey = getPanelPositionKey(context);
    applyPanelLayout(panel, context, positionKey ? panelPositionCache[positionKey] : undefined);
    maybeAutoSyncMarketHistory(context, record, panel);
  }

  async function scanPage(): Promise<void> {
    if (isContextInvalidated) {
      return;
    }

    repairSteamLocalizationText();

    const contexts: ItemContext[] = [];
    const marketContext = resolveMarketListingContext();

    if (marketContext) {
      contexts.push(marketContext);
    }

    contexts.push(...resolveInventoryContexts());
    contexts.push(...resolveInventorySidebarContexts());

    for (const context of contexts) {
      await renderContext(context);
    }

    await renderInventoryTotalsSection();
  }

  function boot(): void {
    if (!window.location.hostname.endsWith("steamcommunity.com")) {
      return;
    }

    injectPageSelectionBridge();
    document.documentElement.lang = UI_CONTEXT.locale;
    document.documentElement.setAttribute("data-steam-upup", "injected");
    console.info("[Steam Inventory PnL] content script injected:", window.location.href);

    scheduleScan();

    inventoryObserver = new MutationObserver((mutations) => {
      const hasExternalMutation = mutations.some((mutation) => !mutationTouchesPanel(mutation));
      if (hasExternalMutation) {
        scheduleScan();
      }
    });
    inventoryObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "href"]
    });

    window.addEventListener("hashchange", scheduleScan);
    window.addEventListener("popstate", scheduleScan);
    window.addEventListener("resize", scheduleLayoutRefresh);
    window.addEventListener("scroll", scheduleLayoutRefresh, true);
    refreshIntervalId = window.setInterval(() => scheduleScan(), REFRESH_INTERVAL_MS);
  }

  boot();
}
