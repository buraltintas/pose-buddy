# Pose Buddy (Productized Vertical Slice)

Pose Buddy is an iOS-first mobile puzzle game slice built with Phaser 3 + TypeScript.
The app keeps gameplay and screen flow stable while adding native-readiness features for iPhone testing.

## Run

```bash
npm install
npm run dev
```

Production build check:

```bash
npm run build
```

## iPhone Native Test Flow (Capacitor)

Capacitor packages used:

- @capacitor/core
- @capacitor/cli
- @capacitor/ios

Capacitor config:

- [capacitor.config.ts](capacitor.config.ts)
- `webDir` points to `dist`

Native workflow:

```bash
npm run build
npx cap add ios        # run once if ios/ is missing
npx cap sync ios
npx cap open ios
```

Optional npm shortcuts:

```bash
npm run cap:add:ios
npm run cap:sync:ios
npm run cap:open:ios
```

## Implemented Product Flow

- Boot startup scene
- Home scene: Play, Level Select, Gallery, Pose Library, Settings
- Game scene: target pose card + interactive rig + progress + success + next level
- Level Select scene with unlocked/locked states
- Gallery scene for solved poses/history resume
- Settings scene with language + audio/ads/reminder toggles + progress reset

## Localization (6 Languages)

Supported languages:

- English
- Turkish
- German
- Spanish
- French
- Portuguese

All player-facing scene strings and reminder messages are translation-key based.

## Progress Persistence

Persistence files:

- [src/models/progress.ts](src/models/progress.ts)
- [src/services/ProgressService.ts](src/services/ProgressService.ts)

Stored fields include progression, attempts, scores, language, and settings.
Settings now include reminder preferences:

- `remindersEnabled`
- `reminderHour`

## Ads Architecture (Capacitor + AdMob)

Dependencies:

- @capacitor-community/admob

Ad service layering:

- [src/services/AdService.ts](src/services/AdService.ts)
- [src/services/AdMobAdService.ts](src/services/AdMobAdService.ts)
- [src/services/MockAdService.ts](src/services/MockAdService.ts)
- [src/services/createAdService.ts](src/services/createAdService.ts)

Configuration:

- [src/config/ads.ts](src/config/ads.ts)
- [.env.example](.env.example)

Native iOS ad config:

- [ios/App/App/Info.plist](ios/App/App/Info.plist) includes:
  - `GADApplicationIdentifier` (currently Google test app id)
  - `NSUserTrackingUsageDescription`
  - `SKAdNetworkItems` starter entry

Ad startup/init safety:

- ads initialize in [src/scenes/BootScene.ts](src/scenes/BootScene.ts)
- native platform uses `AdMobAdService`
- browser/dev uses `MockAdService`
- init/preload failures are non-fatal and do not block gameplay

Test-ads safety:

- non-production defaults to test mode
- missing production unit IDs fall back to Google test ad units
- optional test-device IDs can be set via `VITE_ADS_TEST_DEVICE_IDS`

Monetization behavior preserved:

- interstitial checks only on natural completion transitions
- rewarded flow remains optional skeleton
- no banners injected into gameplay screen

## Local Notifications + 3-Day Reminder Strategy

Dependencies:

- @capacitor/local-notifications
- @capacitor/app

Notification service layering:

- [src/services/NotificationService.ts](src/services/NotificationService.ts)
- [src/services/LocalNotificationService.ts](src/services/LocalNotificationService.ts)
- [src/services/MockNotificationService.ts](src/services/MockNotificationService.ts)
- [src/services/createNotificationService.ts](src/services/createNotificationService.ts)
- [src/config/notifications.ts](src/config/notifications.ts)

Behavior:

- reminders default to OFF
- default reminder hour is 18:00 local time
- enabling reminders requests permission on native devices
- disabling reminders cancels pending Pose Buddy reminder notifications

Rolling every-3-days approach:

- app schedules a forward batch (default 12 reminders)
- each reminder is spaced by 3 days
- stable IDs prevent duplicate scheduling
- startup/resume/settings refresh tops up missing future reminders

Reminder copy:

- fun, friendly copy pool
- all reminder title/body strings are localized through existing i18n maps

Browser fallback:

- web/dev mode uses no-op mock notification service
- app remains stable when native notification APIs are unavailable

## Environment Variables

See [.env.example](.env.example).

Ad placeholders:

- `VITE_IOS_ADMOB_APP_ID`
- `VITE_IOS_INTERSTITIAL_UNIT_ID`
- `VITE_IOS_REWARDED_UNIT_ID`
- `VITE_ANDROID_ADMOB_APP_ID`
- `VITE_ANDROID_INTERSTITIAL_UNIT_ID`
- `VITE_ANDROID_REWARDED_UNIT_ID`
- `VITE_ADS_TEST_MODE`
- `VITE_ADS_TEST_DEVICE_IDS`

Notification defaults:

- `VITE_REMINDER_DEFAULT_ENABLED`
- `VITE_REMINDER_DEFAULT_HOUR`
- `VITE_REMINDER_BATCH_SIZE`
- `VITE_NOTIFICATION_DEBUG`

## Project Structure (Updated)

```text
capacitor.config.ts
ios/
src/
  config/
    ads.ts
    gameConfig.ts
    notifications.ts
    theme.ts
  core/
    gameContext.ts
    sceneKeys.ts
  i18n/
    de.ts
    en.ts
    es.ts
    fr.ts
    index.ts
    pt.ts
    tr.ts
    types.ts
  scenes/
    BaseScene.ts
    BootScene.ts
    GalleryScene.ts
    GameScene.ts
    HomeScene.ts
    LevelSelectScene.ts
    PoseLibraryScene.ts
    SettingsScene.ts
  services/
    AdMobAdService.ts
    LocalNotificationService.ts
    MockAdService.ts
    MockNotificationService.ts
    NotificationService.ts
    createAdService.ts
    createNotificationService.ts
```

## Manual Xcode / Device Steps Still Required

1. Fix local Xcode plugin/tooling if `pod install` fails from CLI:

```bash
xcodebuild -runFirstLaunch
```

2. Open iOS workspace and set:

- Team in Signing & Capabilities
- valid Bundle Identifier/profile for your Apple account
- deployment target compatibility for your local Xcode toolchain

3. On real iPhone:

- enable Developer Mode
- trust developer certificate
- grant local notification permission on first enable

4. For release ad rollout later:

- replace test `GADApplicationIdentifier` in [ios/App/App/Info.plist](ios/App/App/Info.plist)
- set production unit IDs in local `.env`
- keep `VITE_ADS_TEST_MODE=1` during development and internal QA
