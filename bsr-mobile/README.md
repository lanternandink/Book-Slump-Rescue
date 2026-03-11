# Book Slump Rescue — Mobile App

Native iOS and Android wrapper built with Expo + React Native WebView.
No Mac required — cloud builds run on Expo's servers via EAS Build.

## First-time setup

1. **Create a free Expo account** at https://expo.dev if you don't have one.

2. **Install dependencies**
   ```bash
   cd bsr-mobile
   npm install
   ```

3. **Log in to Expo**
   ```bash
   npx eas-cli@latest login
   ```

## Building for iOS (App Store)

```bash
npx eas-cli@latest build --platform ios --profile production
```

- First run will prompt for your Apple ID and password
- EAS will automatically generate and manage certificates and provisioning profiles
- Build runs in the cloud (takes ~15–20 minutes)
- When done, download the `.ipa` file from the Expo dashboard

## Submitting to App Store Connect

```bash
npx eas-cli@latest submit --platform ios
```

- EAS will upload the latest build directly to App Store Connect
- You can then complete the listing in App Store Connect and submit for review

## TestFlight beta (recommended before full release)

```bash
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest submit --platform ios
```

Then invite testers from App Store Connect → TestFlight.

## Building for Android (Google Play)

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android
```

## App details

| Field | Value |
|---|---|
| Bundle ID | `com.bookslumprescue.app` |
| App URL | `https://slump-solver--aremi9110.replit.app` |
| Expo slug | `book-slump-rescue` |
| Theme color | `#b5651d` |
| Background | `#fdf6ee` |
