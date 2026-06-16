# Android Cloud App Setup

This is the version you want if you will not be near your PC.

The local test app depends on your computer. The cloud app runs online, so your Android phone can use it anywhere.

## What You Need

- A Google AI Studio key
- A free/cheap cloud host such as Render
- This app folder uploaded to the host

## Render Setup

1. Go to `https://render.com`
2. Create an account
3. Create a new **Web Service**
4. Upload/connect this app folder
5. Use this start command:

```text
python cloud_server.py
```

6. Add this environment variable:

```text
GOOGLE_API_KEY=your_google_ai_key
```

7. Deploy

## Android Install

1. Open the Render app URL in Chrome on Android
2. Tap the menu
3. Tap **Add to Home screen** or **Install app**

Now you can use it away from your PC.

## Important Marketplace Note

Facebook and Craigslist still require final human posting. The app can create the listing, copy the ad text, and open the posting page.
