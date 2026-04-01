# Chrome Web Store Submission Kit

This folder contains the store assets and copy for the first public release of Steam Inventory PnL.

## Generated assets

- Extension icons: `static/icons/icon16.png`, `static/icons/icon32.png`, `static/icons/icon48.png`, `static/icons/icon128.png`
- Store icon source: `store/assets/icon512.png`
- Screenshots:
  - `store/screenshots/01-market-page-overview.png`
  - `store/screenshots/02-market-history-sync.png`
  - `store/screenshots/03-popup-tracker.png`
- Upload package: `release/steam-inventory-pnl-chrome-v0.2.1.zip`

## Recommended category

- Primary: `Shopping`
- Alternative: `Productivity`

## Default listing copy (English)

### Summary

Track custom cost, fees, and estimated profit for Steam Market and inventory items directly on Steam Community pages.

### Description

Steam Inventory PnL adds a local profit snapshot to Steam Community Market listings and Steam inventory item views.

Use it to save your own cost basis, quantity, fee rate, and notes for each item you track. The extension compares your saved numbers with live Steam pricing to estimate net proceeds, per-item profit and loss, total profit and loss, return rate, and break-even sale price.

Key features:

- Profit snapshot directly on Steam item pages
- Custom cost, quantity, fee, and note fields per item
- Optional import from Steam Market buy history
- Popup list of tracked items stored in this browser profile
- Traditional Chinese and English UI support

Steam Inventory PnL only runs on `steamcommunity.com` pages and stores tracking data locally in Chrome.

This extension is not affiliated with or endorsed by Valve or Steam.

## Optional Traditional Chinese listing copy

### Summary

在 Steam Community 物品頁與庫存頁直接追蹤自訂成本、手續費與預估損益。

### Description

Steam Inventory PnL 會在 Steam Community Market 物品頁與 Steam 庫存物品檢視中加入本機損益面板。

你可以為每個追蹤中的物品儲存自訂成本、數量、手續費比例與備註，並直接和 Steam 當前價格比較，快速查看預估淨收、單件損益、總損益、報酬率與回本售價。

功能重點：

- 直接顯示在 Steam 物品頁的損益快照
- 每個物品可分別儲存成本、數量、手續費與備註
- 可選擇從 Steam Market 買入紀錄匯入成本
- 擴充功能 popup 可查看目前已追蹤物品
- 支援繁體中文與英文介面

此擴充功能只會在 `steamcommunity.com` 頁面上運作，並將追蹤資料儲存在本機 Chrome 瀏覽器中。

本擴充功能與 Valve 或 Steam 無任何隸屬或背書關係。

## Privacy tab suggestions

These entries are based on the current extension code and the current Chrome Web Store privacy flow. Dashboard wording may change over time, so treat the exact checkbox names as a reviewer-facing draft and verify them before submitting.

### Single purpose

Help Steam users track item cost basis and estimated profit for Steam Market listings and inventory items directly on Steam Community pages.

### Permission justifications

- `storage`: Saves the user's custom item costs, quantities, notes, fee settings, imported cost history, and panel positions locally in the browser.
- `https://steamcommunity.com/*`: Reads Steam Community Market and inventory pages so the extension can inject its UI, fetch Steam market price data, and optionally import Steam Market buy history for the active item.

### Remote code

- Recommended answer: `No, this extension does not execute remote code.`

### Data handling draft

This section is an inference from the extension behavior:

- The extension reads item names, prices, and inventory context from `steamcommunity.com` pages.
- The extension stores user-entered cost basis, quantity, fee rate, note text, imported market buy history cost data, and panel position data in `chrome.storage.local`.
- Data is used only to provide the PnL tracking feature inside Steam Community pages.
- Data is not sold.
- Data is not transferred to third parties, except requests sent directly to Steam endpoints that are necessary for price lookup and optional market history import.

## Submission checklist

1. Run `python scripts/generate_store_assets.py`
2. Run `cmd /c npm run package`
3. Publish `store/privacy-policy.md` at a public HTTPS URL
4. Sign in to the Chrome Developer Dashboard
5. Add a new item and upload `release/steam-inventory-pnl-chrome-v0.2.1.zip`
6. Fill in the listing description, screenshots, and privacy fields using this file as the draft
7. Submit for review
