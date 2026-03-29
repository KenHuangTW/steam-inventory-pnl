(() => {
  const ASSET_EVENT_NAME = "steam-upup:selected-asset";
  const FEE_EVENT_NAME = "steam-upup:fee-config";
  const FEE_CALC_REQUEST_EVENT_NAME = "steam-upup:fee-calc-request";
  const FEE_CALC_RESPONSE_EVENT_NAME = "steam-upup:fee-calc-response";
  let lastAssetKey = "";
  let lastFeeConfigKey = "";
  document.documentElement.setAttribute("data-steam-upup-page-bridge-script", "ready");

  type SelectedInventoryItem = {
    appid?: string | number;
    contextid?: string | number;
    assetid?: string | number;
    id?: string | number;
    description?: {
      market_fee?: string | number;
    } | null;
  };

  type ActiveInventory = {
    appid?: string | number;
    contextid?: string | number;
    selectedItem?: SelectedInventoryItem | null;
  };

  type WalletInfo = {
    wallet_fee?: string | number;
    wallet_fee_base?: string | number;
    wallet_fee_minimum?: string | number;
    wallet_fee_percent?: string | number;
    wallet_publisher_fee_percent_default?: string | number;
  };

  type FeeConfigDetail = {
    walletFeePercent: number | null;
    walletFeeBase: number | null;
    walletFeeMinimum: number | null;
    defaultPublisherFeePercent: number | null;
    itemPublisherFeePercent: number | null;
  };

  type FeeCalcDirection = "buyer-to-seller" | "seller-to-buyer";

  type FeeCalcRequestDetail = {
    requestId: string;
    direction: FeeCalcDirection;
    amountMinor: number;
    totalFeeRate: number;
  };

  type FeeCalcResponseDetail = {
    requestId: string;
    direction: FeeCalcDirection;
    ok: boolean;
    buyerPaysMinor: number | null;
    sellerReceivesMinor: number | null;
  };

  type FeeAmountResult = {
    steam_fee?: string | number;
    publisher_fee?: string | number;
    fees?: string | number;
    amount?: string | number;
  };

  const pageWindow = window as Window & {
    g_ActiveInventory?: ActiveInventory;
    g_rgWalletInfo?: WalletInfo | null;
    CalculateFeeAmount?: (amount: number, publisherFee?: number, walletInfo?: WalletInfo | null) => FeeAmountResult;
    CalculateAmountToSendForDesiredReceivedAmount?: (
      receivedAmount: number,
      publisherFee?: number,
      walletInfo?: WalletInfo | null
    ) => FeeAmountResult;
  };

  const parseNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  const dispatchSelection = () => {
    try {
      const activeInventory = pageWindow.g_ActiveInventory;
      const selectedItem = activeInventory?.selectedItem;

      if (!selectedItem) {
        if (lastAssetKey) {
          lastAssetKey = "";
          document.dispatchEvent(new CustomEvent(ASSET_EVENT_NAME, { detail: null }));
        }
        return;
      }

      const appId = String(selectedItem.appid ?? activeInventory?.appid ?? "");
      const contextId = String(selectedItem.contextid ?? activeInventory?.contextid ?? "");
      const assetId = String(selectedItem.assetid ?? selectedItem.id ?? "");
      const nextKey = appId && contextId && assetId ? `${appId}_${contextId}_${assetId}` : "";

      if (!nextKey || nextKey === lastAssetKey) {
        return;
      }

      lastAssetKey = nextKey;
      document.documentElement.setAttribute("data-steam-upup-page-bridge-last-key", nextKey);
      document.dispatchEvent(
        new CustomEvent(ASSET_EVENT_NAME, {
          detail: {
            appId,
            contextId,
            assetId
          }
        })
      );
    } catch {
      document.documentElement.setAttribute("data-steam-upup-page-bridge-script", "error");
    }
  };

  const dispatchFeeConfig = () => {
    try {
      const activeInventory = pageWindow.g_ActiveInventory;
      const selectedItem = activeInventory?.selectedItem;
      const walletInfo = pageWindow.g_rgWalletInfo;

      const detail: FeeConfigDetail = {
        walletFeePercent: parseNumber(walletInfo?.wallet_fee_percent),
        walletFeeBase: parseNumber(walletInfo?.wallet_fee_base),
        walletFeeMinimum: parseNumber(walletInfo?.wallet_fee_minimum),
        defaultPublisherFeePercent: parseNumber(walletInfo?.wallet_publisher_fee_percent_default),
        itemPublisherFeePercent: parseNumber(selectedItem?.description?.market_fee)
      };

      const nextKey = JSON.stringify(detail);
      if (nextKey === lastFeeConfigKey) {
        return;
      }

      lastFeeConfigKey = nextKey;
      document.documentElement.setAttribute("data-steam-upup-page-bridge-fee-config", nextKey);
      document.dispatchEvent(new CustomEvent(FEE_EVENT_NAME, { detail }));
    } catch {
      document.documentElement.setAttribute("data-steam-upup-page-bridge-script", "error");
    }
  };

  const dispatchPageContext = () => {
    dispatchSelection();
    dispatchFeeConfig();
  };

  const getWalletInfo = (): WalletInfo | null => {
    return pageWindow.g_rgWalletInfo ?? null;
  };

  const getSteamFeePercent = (walletInfo: WalletInfo | null): number => {
    return parseNumber(walletInfo?.wallet_fee_percent) ?? 0.05;
  };

  const getWalletFeeBase = (walletInfo: WalletInfo | null): number => {
    return Math.max(0, Math.round(parseNumber(walletInfo?.wallet_fee_base) ?? 0));
  };

  const getWalletFeeMinimum = (walletInfo: WalletInfo | null): number => {
    return Math.max(0, Math.round(parseNumber(walletInfo?.wallet_fee_minimum) ?? 1));
  };

  const getPublisherFeePercent = (totalFeeRate: number, walletInfo: WalletInfo | null): number => {
    return Math.max((parseNumber(totalFeeRate) ?? 0) - getSteamFeePercent(walletInfo), 0);
  };

  const calculateAmountToSendFallback = (
    receivedAmount: number,
    publisherFee: number,
    walletInfo: WalletInfo | null
  ): FeeAmountResult => {
    const steamFeePercent = getSteamFeePercent(walletInfo);
    const walletFeeBase = getWalletFeeBase(walletInfo);
    const walletFeeMinimum = getWalletFeeMinimum(walletInfo);
    const steamFee = Math.floor(Math.max(receivedAmount * steamFeePercent, walletFeeMinimum) + walletFeeBase);
    const publisherFeeAmount = Math.floor(publisherFee > 0 ? Math.max(receivedAmount * publisherFee, 1) : 0);

    return {
      steam_fee: steamFee,
      publisher_fee: publisherFeeAmount,
      fees: steamFee + publisherFeeAmount,
      amount: receivedAmount + steamFee + publisherFeeAmount
    };
  };

  const calculateFeeAmountFallback = (
    amount: number,
    publisherFee: number,
    walletInfo: WalletInfo | null
  ): FeeAmountResult => {
    const walletFeeBase = getWalletFeeBase(walletInfo);
    const steamFeePercent = getSteamFeePercent(walletInfo);
    let estimatedReceivedAmount = Math.max(
      0,
      Math.floor((amount - walletFeeBase) / (steamFeePercent + publisherFee + 1))
    );
    let everUndershot = false;
    let result = calculateAmountToSendFallback(estimatedReceivedAmount, publisherFee, walletInfo);
    let iterations = 0;

    while (parseNumber(result.amount) !== amount && iterations < 10) {
      const currentAmount = parseNumber(result.amount) ?? amount;

      if (currentAmount > amount) {
        if (everUndershot) {
          const adjusted = calculateAmountToSendFallback(Math.max(0, estimatedReceivedAmount - 1), publisherFee, walletInfo);
          const adjustment = amount - (parseNumber(adjusted.amount) ?? amount);

          return {
            steam_fee: (parseNumber(adjusted.steam_fee) ?? 0) + adjustment,
            publisher_fee: parseNumber(adjusted.publisher_fee) ?? 0,
            fees: (parseNumber(adjusted.fees) ?? 0) + adjustment,
            amount
          };
        }

        estimatedReceivedAmount = Math.max(0, estimatedReceivedAmount - 1);
      } else {
        everUndershot = true;
        estimatedReceivedAmount += 1;
      }

      result = calculateAmountToSendFallback(estimatedReceivedAmount, publisherFee, walletInfo);
      iterations += 1;
    }

    return result;
  };

  const handleFeeCalcRequest = (event: Event) => {
    try {
      const customEvent = event as CustomEvent<FeeCalcRequestDetail | null>;
      const detail = customEvent.detail;

      if (!detail?.requestId || !detail.direction || !Number.isFinite(detail.amountMinor)) {
        return;
      }

      const walletInfo = getWalletInfo();
      const publisherFee = getPublisherFeePercent(detail.totalFeeRate, walletInfo);
      const response: FeeCalcResponseDetail = {
        requestId: detail.requestId,
        direction: detail.direction,
        ok: false,
        buyerPaysMinor: null,
        sellerReceivesMinor: null
      };

      if (detail.direction === "buyer-to-seller") {
        const feeResult =
          typeof pageWindow.CalculateFeeAmount === "function"
            ? pageWindow.CalculateFeeAmount(detail.amountMinor, publisherFee, walletInfo)
            : calculateFeeAmountFallback(detail.amountMinor, publisherFee, walletInfo);
        const totalFees = parseNumber(feeResult?.fees);

        if (totalFees !== null) {
          response.ok = true;
          response.buyerPaysMinor = detail.amountMinor;
          response.sellerReceivesMinor = Math.max(0, detail.amountMinor - totalFees);
        }
      } else {
        const feeResult =
          typeof pageWindow.CalculateAmountToSendForDesiredReceivedAmount === "function"
            ? pageWindow.CalculateAmountToSendForDesiredReceivedAmount(detail.amountMinor, publisherFee, walletInfo)
            : calculateAmountToSendFallback(detail.amountMinor, publisherFee, walletInfo);
        const buyerPaysMinor = parseNumber(feeResult?.amount);

        if (buyerPaysMinor !== null) {
          response.ok = true;
          response.buyerPaysMinor = buyerPaysMinor;
          response.sellerReceivesMinor = detail.amountMinor;
        }
      }

      document.dispatchEvent(new CustomEvent(FEE_CALC_RESPONSE_EVENT_NAME, { detail: response }));
    } catch {
      document.documentElement.setAttribute("data-steam-upup-page-bridge-script", "error");
    }
  };

  document.addEventListener(FEE_CALC_REQUEST_EVENT_NAME, handleFeeCalcRequest as EventListener);
  dispatchPageContext();
  window.setInterval(dispatchPageContext, 250);
})();
