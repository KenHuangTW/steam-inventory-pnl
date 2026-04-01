namespace SteamUpupShared {
  export type SupportedLocale = "zh-TW" | "en";
  export type RecordSource = "manual" | "market-history";
  export type CostBasisKind = "manual" | "case-opening" | "weekly-drop";

  export interface Translations {
    genericSteamItem: string;
    genericInventoryItem: string;
    unknownItem: string;
    panelTitle: string;
    badgeTracked: string;
    badgeNew: string;
    marketPrice: string;
    estimatedNet: string;
    pnlPerUnit: string;
    totalPnl: string;
    returnRate: string;
    breakEvenGross: string;
    sourcePriceOnPage: string;
    sourcePriceoverview: string;
    sourceLowestListing: string;
    sourceMedianPrice: string;
    basedOnCustomCost: string;
    basedOnCaseOpeningCost: string;
    basedOnWeeklyDropCost: string;
    approximateSalePriceTarget: string;
    customCost: string;
    caseOpeningCost: string;
    weeklyDropCost: string;
    quantity: string;
    feePercent: string;
    note: string;
    notePlaceholder: string;
    caseOpenedPreset: string;
    weeklyDropPreset: string;
    caseOpeningCostUnavailable: string;
    save: string;
    reset: string;
    openListing: string;
    unavailable: string;
    savedInBrowser: string;
    savedOverride: string;
    savedCaseOpeningCost: string;
    savedWeeklyDropCost: string;
    removedOverride: string;
    invalidCustomCost: string;
    invalidCaseOpeningCost: string;
    invalidWeeklyDropCost: string;
    popupTitle: string;
    popupIntro: string;
    popupRefresh: string;
    popupClearAll: string;
    popupEmpty: string;
    popupCost: string;
    popupFee: string;
    popupOpen: string;
    popupLocalOnly: string;
    popupClearConfirm: string;
    syncHistory: string;
    syncingHistory: string;
    importedFromMarketHistory: string;
    aliasedFromMarketHistory: string;
    debugMatchInfo: string;
  }

  export interface UiContext {
    locale: SupportedLocale;
    numberLocale: string;
    steamCurrencyCode: number;
    fallbackCurrencySymbol: string;
    translations: Translations;
  }

  const TRANSLATIONS: Record<SupportedLocale, Translations> = {
    "zh-TW": {
      genericSteamItem: "\u0053\u0074\u0065\u0061\u006d \u7269\u54c1",
      genericInventoryItem: "\u0053\u0074\u0065\u0061\u006d \u5eab\u5b58\u7269\u54c1",
      unknownItem: "\u672a\u77e5\u7269\u54c1",
      panelTitle: "\u640d\u76ca\u5feb\u7167",
      badgeTracked: "\u5df2\u8ffd\u8e64",
      badgeNew: "New",
      marketPrice: "\u5e02\u5834\u50f9\u683c",
      estimatedNet: "\u9810\u4f30\u6de8\u6536",
      pnlPerUnit: "\u55ae\u4ef6\u640d\u76ca",
      totalPnl: "\u7e3d\u640d\u76ca",
      returnRate: "\u5831\u916c\u7387",
      breakEvenGross: "\u56de\u672c\u552e\u50f9",
      sourcePriceOnPage: "\u9801\u9762\u986f\u793a\u50f9\u683c",
      sourcePriceoverview: "\u0053\u0074\u0065\u0061\u006d \u0070\u0072\u0069\u0063\u0065\u006f\u0076\u0065\u0072\u0076\u0069\u0065\u0077",
      sourceLowestListing: "\u6700\u4f4e\u520a\u767b\u50f9",
      sourceMedianPrice: "\u6210\u4ea4\u4e2d\u4f4d\u50f9",
      basedOnCustomCost: "\u4f9d\u4f60\u7684\u81ea\u8a02\u6210\u672c\u8a08\u7b97",
      basedOnCaseOpeningCost: "\u4f9d\u4f60\u7684\u958b\u7bb1\u6210\u672c\u8a08\u7b97",
      basedOnWeeklyDropCost: "\u4f9d\u4f60\u7684\u6bcf\u9031\u6389\u843d\u6210\u672c\u8a08\u7b97",
      approximateSalePriceTarget: "\u4f30\u7b97\u56de\u672c\u552e\u50f9\u76ee\u6a19",
      customCost: "\u81ea\u8a02\u6210\u672c",
      caseOpeningCost: "\u958b\u7bb1\u6210\u672c",
      weeklyDropCost: "\u6bcf\u9031\u6389\u843d\u6210\u672c",
      quantity: "\u6578\u91cf",
      feePercent: "\u624b\u7e8c\u8cbb %",
      note: "\u5099\u8a3b",
      notePlaceholder: "\u9078\u586b\u5099\u8a3b",
      caseOpenedPreset: "\u7bb1\u5b50\u958b\u51fa",
      weeklyDropPreset: "\u6bcf\u9031\u6389\u843d",
      caseOpeningCostUnavailable: "\u76ee\u524d\u9084\u6c92\u6709\u8a2d\u5b9a\u9019\u500b\u5730\u5340\u7684\u9810\u8a2d\u958b\u7bb1\u6210\u672c\u3002",
      save: "\u5132\u5b58",
      reset: "\u91cd\u8a2d",
      openListing: "\u6253\u958b\u5e02\u96c6\u9801",
      unavailable: "\u7121\u6cd5\u53d6\u5f97",
      savedInBrowser: "\u8cc7\u6599\u53ea\u6703\u5132\u5b58\u5728\u9019\u500b\u700f\u89bd\u5668\u3002",
      savedOverride: "\u5df2\u5132\u5b58\u81ea\u8a02\u6210\u672c\u3002",
      savedCaseOpeningCost: "\u5df2\u5132\u5b58\u958b\u7bb1\u6210\u672c\u3002",
      savedWeeklyDropCost: "\u5df2\u5132\u5b58\u6bcf\u9031\u6389\u843d\u6210\u672c\u3002",
      removedOverride: "\u5df2\u79fb\u9664\u81ea\u8a02\u6210\u672c\u3002",
      invalidCustomCost: "\u8acb\u8f38\u5165\u6709\u6548\u7684\u81ea\u8a02\u6210\u672c\u3002",
      invalidCaseOpeningCost: "\u8acb\u8f38\u5165\u6709\u6548\u7684\u958b\u7bb1\u6210\u672c\u3002",
      invalidWeeklyDropCost: "\u8acb\u8f38\u5165\u6709\u6548\u7684\u6bcf\u9031\u6389\u843d\u6210\u672c\u3002",
      popupTitle: "\u7269\u54c1\u5eab\u640d\u76ca\u8ffd\u8e64",
      popupIntro:
        "\u5728 \u0053\u0074\u0065\u0061\u006d \u5e02\u96c6\u9801\u6216\u7269\u54c1\u5eab\u7269\u54c1\u4e0a\u5132\u5b58\u81ea\u8a02\u6210\u672c\uff0c\u76f4\u63a5\u8ffd\u8e64\u50f9\u683c\u3001\u6de8\u6536\u8207\u640d\u76ca\u3002",
      popupRefresh: "\u91cd\u65b0\u6574\u7406",
      popupClearAll: "\u5168\u90e8\u6e05\u9664",
      popupEmpty:
        "\u6253\u958b \u0053\u0074\u0065\u0061\u006d \u5e02\u96c6\u9801\u6216\u5eab\u5b58\u7269\u54c1\u5f8c\uff0c\u5132\u5b58\u81ea\u8a02\u6210\u672c\u5373\u53ef\u958b\u59cb\u8ffd\u8e64\u3002",
      popupCost: "\u6210\u672c",
      popupFee: "\u624b\u7e8c\u8cbb",
      popupOpen: "\u6253\u958b",
      popupLocalOnly: "\u50c5\u672c\u6a5f",
      popupClearConfirm: "\u8981\u6e05\u9664\u6240\u6709\u5df2\u5132\u5b58\u7684\u672c\u6a5f\u6210\u672c\u55ce\uff1f",
      syncHistory: "\u540c\u6b65\u5e02\u96c6\u7d00\u9304",
      syncingHistory: "\u540c\u6b65\u5e02\u96c6\u7d00\u9304\u4e2d...",
      importedFromMarketHistory: "\u4f86\u81ea\u5e02\u96c6\u8cb7\u5165\u7d00\u9304",
      aliasedFromMarketHistory: "\u5df2\u5957\u7528\u540c\u540d\u552f\u4e00\u7684\u5e02\u96c6\u8cb7\u5165\u6210\u672c",
      debugMatchInfo: "\u5339\u914d\u8cc7\u8a0a"
    },
    en: {
      genericSteamItem: "Steam Item",
      genericInventoryItem: "Steam Inventory Item",
      unknownItem: "Unknown Item",
      panelTitle: "Profit Snapshot",
      badgeTracked: "Tracked",
      badgeNew: "New",
      marketPrice: "Market price",
      estimatedNet: "Estimated net",
      pnlPerUnit: "PnL / unit",
      totalPnl: "Total PnL",
      returnRate: "Return rate",
      breakEvenGross: "Break-even gross",
      sourcePriceOnPage: "Price shown on page",
      sourcePriceoverview: "Steam priceoverview",
      sourceLowestListing: "Lowest listing",
      sourceMedianPrice: "Median price",
      basedOnCustomCost: "Based on your custom cost",
      basedOnCaseOpeningCost: "Based on your case-opening cost",
      basedOnWeeklyDropCost: "Based on your weekly-drop cost",
      approximateSalePriceTarget: "Approximate sale price target",
      customCost: "Custom cost",
      caseOpeningCost: "Case-opening cost",
      weeklyDropCost: "Weekly drop cost",
      quantity: "Quantity",
      feePercent: "Fee %",
      note: "Note",
      notePlaceholder: "Optional memo",
      caseOpenedPreset: "Case opened",
      weeklyDropPreset: "Weekly drop",
      caseOpeningCostUnavailable: "No default case-opening cost is configured for this locale yet.",
      save: "Save",
      reset: "Reset",
      openListing: "Open listing",
      unavailable: "Unavailable",
      savedInBrowser: "Saved locally in this browser profile.",
      savedOverride: "Saved local cost override.",
      savedCaseOpeningCost: "Saved case-opening cost.",
      savedWeeklyDropCost: "Saved weekly-drop cost.",
      removedOverride: "Removed local override.",
      invalidCustomCost: "Enter a valid custom cost before saving.",
      invalidCaseOpeningCost: "Enter a valid case-opening cost before saving.",
      invalidWeeklyDropCost: "Enter a valid weekly-drop cost before saving.",
      popupTitle: "Inventory PnL Tracker",
      popupIntro: "Save a custom cost on any Steam listing or inventory item and track price, net proceeds, and profit directly on the page.",
      popupRefresh: "Refresh",
      popupClearAll: "Clear All",
      popupEmpty: "Open a Steam listing or inventory item and save a custom cost to start tracking.",
      popupCost: "Cost",
      popupFee: "Fee",
      popupOpen: "Open",
      popupLocalOnly: "Local only",
      popupClearConfirm: "Clear every saved local cost override?",
      syncHistory: "Sync market history",
      syncingHistory: "Syncing market history...",
      importedFromMarketHistory: "Imported from market buy history",
      aliasedFromMarketHistory: "Applied the only matching market buy cost",
      debugMatchInfo: "Match debug"
    }
  };

  function isTraditionalChineseLocale(candidate: string): boolean {
    const normalized = candidate.trim().toLowerCase();
    return (
      normalized.startsWith("zh-tw") ||
      normalized.startsWith("zh-hk") ||
      normalized.startsWith("zh-mo") ||
      normalized.startsWith("zh-hant")
    );
  }

  export function resolveUiContext(): UiContext {
    const candidates = [
      ...(navigator.languages ?? []),
      navigator.language ?? "",
      document.documentElement.lang ?? ""
    ].filter(Boolean);

    const locale: SupportedLocale = candidates.some(isTraditionalChineseLocale) ? "zh-TW" : "en";

    if (locale === "zh-TW") {
      return {
        locale,
        numberLocale: "zh-TW",
        steamCurrencyCode: 30,
        fallbackCurrencySymbol: "NT$",
        translations: TRANSLATIONS[locale]
      };
    }

    return {
      locale,
      numberLocale: "en-US",
      steamCurrencyCode: 1,
      fallbackCurrencySymbol: "$",
      translations: TRANSLATIONS[locale]
    };
  }

  export function formatUnitCount(count: number, locale: SupportedLocale): string {
    if (locale === "zh-TW") {
      return `\u5df2\u8ffd\u8e64 ${count} \u4ef6`;
    }

    return `${count} tracked`;
  }

  export function formatTrackedItemsCount(count: number, locale: SupportedLocale): string {
    if (locale === "zh-TW") {
      return `\u5df2\u8ffd\u8e64 ${count} \u4ef6`;
    }

    return `${count} tracked item${count === 1 ? "" : "s"}`;
  }

  function roundToPrecision(value: number, fractionDigits: number): number {
    const scale = 10 ** fractionDigits;
    return Math.round((value + Number.EPSILON) * scale) / scale;
  }

  export function normalizeFeeRate(feeRate: number): number {
    if (!Number.isFinite(feeRate)) {
      return 0;
    }

    return Math.max(0, roundToPrecision(feeRate, 4));
  }

  export function formatFeePercentValue(feeRate: number, locale: SupportedLocale): string {
    const percentage = roundToPrecision(normalizeFeeRate(feeRate) * 100, 2);
    const numberLocale = locale === "zh-TW" ? "zh-TW" : "en-US";

    return percentage.toLocaleString(numberLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  export function formatFeeInputValue(feeRate: number): string {
    return roundToPrecision(normalizeFeeRate(feeRate) * 100, 2).toString();
  }

  export function formatFeeText(feeRate: number, locale: SupportedLocale): string {
    const percentage = `${formatFeePercentValue(feeRate, locale)}%`;

    if (locale === "zh-TW") {
      return `\u7e3d\u624b\u7e8c\u8cbb ${percentage}`;
    }

    return `${percentage} total fee`;
  }
}
