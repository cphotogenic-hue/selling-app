# Market Listing Assistant

A local app for turning item photos and condition notes into resale listing drafts for Facebook Marketplace and Craigslist.

## Quick Start

If Node.js is available:

```powershell
cd C:\Users\Scott\Documents\Codex\2026-06-16\i-want-you-to-create-an\outputs\market-listing-assistant
$env:GOOGLE_API_KEY="your_google_ai_key"
npm start
```

Then open:

```text
http://localhost:4173
```

If Node.js is not available, you can still run the interface with Python:

```powershell
cd C:\Users\Scott\Documents\Codex\2026-06-16\i-want-you-to-create-an\outputs\market-listing-assistant\public
py -m http.server 4174
```

Then open:

```text
http://localhost:4174
```

In Python/static mode, Google AI is not connected, so the app uses local draft mode.

## Phone App

Run:

```powershell
C:\Users\Scott\Documents\Codex\2026-06-16\i-want-you-to-create-an\outputs\market-listing-assistant\start-phone.ps1
```

On your phone, connect to the same Wi-Fi and open the address shown in the window.

Then add it to your phone:

- iPhone: tap Share, then **Add to Home Screen**
- Android: tap the Chrome menu, then **Install app** or **Add to Home screen**

For real photo analysis, run:

```powershell
C:\Users\Scott\Documents\Codex\2026-06-16\i-want-you-to-create-an\outputs\market-listing-assistant\connect-google-ai.ps1
```

Paste a Google AI key when it asks.

## Workflow

1. Start a new item.
2. Take photos or upload item images.
3. Enter condition, location, and any defects or included accessories.
4. Click **Analyze photos**.
5. Review and edit the title, description, category, and price.
6. Check all approval boxes.
7. Use the Facebook or Craigslist buttons to copy the ad text and open the posting page.

## Posting Notes

Facebook Marketplace does not provide a normal public API for personal Marketplace item posting. This app prepares the listing and opens the create-item page so you can review and submit it yourself.

Craigslist has a bulk posting interface for qualified/high-volume workflows, but ordinary one-off item posting is still best handled through the human review flow. This app can be extended later to generate Craigslist RSS/XML bulk posting payloads if you have an eligible account.
