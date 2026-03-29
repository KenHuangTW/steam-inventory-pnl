# Steam Inventory PnL

Steam Inventory PnL is a Manifest V3 browser extension for tracking item prices, custom costs, and profit relationships on Steam Community pages.

## What it does

- injects a local inventory PnL panel into Steam market listing pages and visible inventory item popups
- lets you save a custom unit cost, quantity, fee rate, and note per item
- tracks market price, estimated net proceeds, total PnL, return rate, and break-even gross
- stores data locally with `chrome.storage.local`

## Current assumptions

- the extension targets `https://steamcommunity.com/*`
- UI language follows the browser locale: `zh-TW` first, English fallback
- Steam price lookup uses `TWD` for traditional Chinese browsers and `USD` otherwise
- tracking is listing-based (`appid + market_hash_name`), not individual asset-based float tracking

## Local development

```bash
cmd /c npm install
cmd /c npm run build
```

Load the unpacked extension from `dist/` in Chrome or Edge developer mode.

## First places to improve

- detect the user's Steam currency automatically
- support asset-level overrides for float, paint seed, and sticker differences
- import transaction history to replace manual quantity tracking
