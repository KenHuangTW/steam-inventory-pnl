# Steam Inventory PnL Privacy Policy

Last updated: 2026-03-29

This privacy policy applies to the Steam Inventory PnL browser extension.

> Replace the contact details in this file before publishing it at a public URL for the Chrome Web Store listing.

## Overview

Steam Inventory PnL helps users track custom cost basis and estimated profit for items on Steam Community pages. The extension runs only on `https://steamcommunity.com/*`.

## Data the extension processes

The extension may process the following data:

- Steam item and market page information needed to identify the active item and display pricing information
- Steam Market price data fetched from Steam endpoints
- Optional Steam Market buy history data fetched from Steam when the user runs the import feature
- User-entered tracking data, including custom cost, quantity, fee rate, and note text
- Local UI state, including saved panel position and tracked item metadata

## How the data is used

The extension uses this data only to:

- display profit and loss calculations on Steam Community pages
- save the user's local tracking preferences
- show tracked items in the extension popup
- optionally import cost basis from the user's Steam Market buy history

## Storage

Steam Inventory PnL stores tracking data locally in the browser using `chrome.storage.local`.

The extension does not operate its own backend service for syncing or analytics.

## Data sharing

Steam Inventory PnL does not sell user data.

Steam Inventory PnL does not transfer stored tracking data to third parties. The extension sends requests directly to Steam endpoints only when needed to load price data or import Steam Market history from the user's Steam session.

## Data retention and control

Data remains in the user's browser profile until the user clears it, removes the extension, or resets tracked items inside the extension popup.

## Security

The extension keeps its tracking records in local browser storage and uses only the minimum Chrome permissions currently required for the feature set.

## Third-party services

Steam Inventory PnL interacts with Steam Community pages and Steam endpoints that are operated by Valve. Use of Steam is also subject to Valve's own terms and privacy practices.

## Contact

Developer contact email: `your-email@example.com`
