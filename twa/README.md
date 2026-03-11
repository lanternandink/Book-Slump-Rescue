# Book Slump Rescue — TWA Build Guide (Google Play Store)

This guide walks you through building and publishing Book Slump Rescue as an Android app using a Trusted Web Activity (TWA). The TWA wraps your live website in a native Android shell — all features, including Stripe payments, work exactly as they do on the web.

## Prerequisites

- **Node.js** v18 or later
- **JDK 11+** (Java Development Kit)
- **Android SDK** (via Android Studio or standalone SDK tools)
- **Google Play Developer Account**

## Step 1: Install Bubblewrap CLI

Bubblewrap is Google's official tool for generating TWA projects from a web manifest.

```bash
npm install -g @bubblewrap/cli
```

Or use **PWABuilder** (https://www.pwabuilder.com) as a web-based alternative that generates the same output without any CLI setup.

## Step 2: Initialize the TWA Project

From this `twa/` directory:

```bash
bubblewrap init --manifest="https://book-slump-rescue.replit.app/manifest.json"
```

Bubblewrap will read the manifest and prompt you for:
- **Package name**: `com.bookslumprescue.app` (already set in twa-manifest.json)
- **App name**: Book Slump Rescue
- **Signing key location**: It will create one for you, or you can provide an existing keystore

Alternatively, you can point it at the local config:

```bash
bubblewrap init --manifest="./twa-manifest.json"
```

## Step 3: Generate a Signing Key

If Bubblewrap didn't create one during init, generate a keystore:

```bash
keytool -genkey -v -keystore android.keystore -alias bookslumprescue -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for a password and identity details. **Save this keystore and password securely** — you'll need them for every future update.

## Step 4: Get Your SHA-256 Fingerprint

```bash
keytool -list -v -keystore android.keystore -alias bookslumprescue
```

Look for the line that says `SHA256:` followed by a colon-separated hex string like:

```
AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90
```

## Step 5: Update Digital Asset Links (REQUIRED)

This step is critical — without it, the TWA will show an address bar instead of running fullscreen.

Open `server/routes.ts` and find the `/.well-known/assetlinks.json` route. Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` with your actual SHA-256 fingerprint from Step 4.

Then redeploy the site so the updated assetlinks.json is live. Android verifies this file to confirm you own the domain. The TWA will not work correctly until this is done.

You can verify it's working by visiting:
```
https://book-slump-rescue.replit.app/.well-known/assetlinks.json
```

## Step 6: Build the App

```bash
bubblewrap build
```

This generates:
- `app-release-bundle.aab` — the Android App Bundle for Play Store upload
- `app-release-signed.apk` — a signed APK for direct testing

You can test the APK on a physical Android device:

```bash
adb install app-release-signed.apk
```

## Step 7: Submit to Google Play Console

1. Go to https://play.google.com/console
2. Create a new app
3. Fill in the store listing:
   - **App name**: Book Slump Rescue
   - **Short description**: Escape your reading slump with personalized book recommendations
   - **Full description**: Book Slump Rescue helps readers discover their next favorite book through personalized quizzes, curated recommendations, book clubs, and a vibrant reading community. Features include reading challenges, author portals, kids corner, and social features to connect with fellow readers.
   - **Screenshots**: Take screenshots of the app on your Android device (at least 2 phone screenshots required)
   - **Feature graphic**: 1024x500 banner image
   - **App icon**: 512x512 (use icon-512.png from the project)
4. Upload the `.aab` file under **Production > Create new release**
5. Complete the **Content rating** questionnaire
6. Set **Pricing & distribution** (free app)
7. Add your **Privacy Policy URL**: `https://book-slump-rescue.replit.app/privacy`
8. Submit for review

## Pre-Release Checklist

Before submitting to the Play Store, verify:

- [ ] SHA-256 fingerprint is updated in `server/routes.ts` (assetlinks route)
- [ ] Site is deployed with the updated assetlinks.json
- [ ] `/.well-known/assetlinks.json` returns your real fingerprint (not the placeholder)
- [ ] APK tested on a physical Android device
- [ ] App runs fullscreen (no address bar visible)
- [ ] All features work: login, navigation, Stripe checkout, book clubs
- [ ] Store listing assets prepared (screenshots, feature graphic, icon)
- [ ] Privacy policy URL is accessible

## Updating the App

When you update your website, the app automatically reflects those changes since it loads the live site. You only need to submit a new build to the Play Store if you change:
- The app icon or splash screen
- The package configuration
- The signing key

## Troubleshooting

**White address bar appears at the top:**
This means the Digital Asset Links verification failed. Check that:
1. `/.well-known/assetlinks.json` is accessible at your deployed URL
2. The SHA-256 fingerprint matches your signing key exactly
3. The package name matches exactly (`com.bookslumprescue.app`)
4. The site has been redeployed after updating the fingerprint

**App shows "Add to Home Screen" prompt instead of fullscreen:**
Ensure `display: "standalone"` is set in manifest.json and the TWA verification passed.

**Stripe payments not working:**
Stripe Checkout redirects should work normally in a TWA. If you encounter issues, ensure your Stripe success/cancel URLs point to your deployed domain.
