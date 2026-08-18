AgriCore Mobile App Release Foundation
=====================================

Extract over:
C:\projects\Agricore\frontend

What was already present
------------------------
- Capacitor 8
- Android native project
- iOS Capacitor package dependency
- AgriCore icons/splash resources

What this fixes/adds
--------------------
1. Removes the old LAN-only mobile configuration (192.168.1.44).
2. Uses https://app.getagricore.com as the default mobile runtime URL.
3. Cleartext and mixed-content are disabled for release safety.
4. Adds a branded native connection-error page.
5. Adds Android coarse/fine location permissions for AgriCore GPS workflows.
6. Adds agricore:// deep-link scheme.
7. Adds native safe-area handling for notches/system bars.
8. Adds Android release-signing support using an ignored keystore.properties file.
9. Adds repeatable Android sync/build scripts.
10. Adds a macOS iOS setup script that creates the iOS project, adds camera/photo/location privacy strings,
    registers the agricore:// scheme and syncs Capacitor.

IMPORTANT
---------
Capacitor's own documentation says `server.url` is intended for live reload and is not intended
as the final production architecture. AgriCore currently depends heavily on Next.js server routes,
SSR/auth and APIs, so this is the SIMPLE native-beta route without rewriting the frontend as a
local static SPA.

This is suitable for:
- native Android installation/testing now
- TestFlight/internal iOS testing after generating the iOS project on a Mac
- proving the mobile experience

Before public App Store / Google Play launch, AgriCore should expose enough genuinely native value
(camera/GPS/offline/push/deep links) and the store submission should be reviewed against current
minimum-functionality policies.

Android - Windows
-----------------
1. npm install
2. npm run build
3. npm run mobile:android:sync
4. npm run mobile:android:open

Android signed release AAB
--------------------------
Generate a release key ONCE and keep it safe:

keytool -genkeypair -v -keystore android\agricore-release-key.jks -alias agricore -keyalg RSA -keysize 2048 -validity 10000

Copy:
android\keystore.properties.example
to:
android\keystore.properties

Fill in the real passwords.

Then:
npm run mobile:android:aab:win

AAB output is normally under:
android\app\build\outputs\bundle\release\

NEVER lose the release keystore.

iOS
---
Capacitor 8 iOS builds require a Mac with Xcode.

On the Mac:
1. Pull/copy the same AgriCore project.
2. npm install
3. npm run mobile:ios:setup
4. npm run mobile:ios:open
5. In Xcode, choose the Apple Developer Team/signing.
6. Run on a real iPhone first.
7. Archive to App Store Connect / TestFlight.

Development against a local PC
------------------------------
Only for local testing, set CAPACITOR_SERVER_URL before sync, for example:
http://192.168.1.44:3000

Do NOT use an HTTP/LAN URL for a release build.
