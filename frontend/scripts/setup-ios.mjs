import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") {
  console.error("iOS generation requires macOS with Xcode. Copy/pull this project onto a Mac, then run: npm run mobile:ios:setup");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync("ios")) {
  run("npx", ["cap", "add", "ios"]);
}

const plist = "ios/App/App/Info.plist";
const plistBuddy = "/usr/libexec/PlistBuddy";

const entries = [
  [":NSCameraUsageDescription", "AgriCore uses the camera to attach job and machine photos."],
  [":NSPhotoLibraryUsageDescription", "AgriCore lets you select job and machine photos from your photo library."],
  [":NSPhotoLibraryAddUsageDescription", "AgriCore can save photos you create while working on jobs."],
  [":NSLocationWhenInUseUsageDescription", "AgriCore uses your location during field-service workflows such as travel, arrival and job location capture."],
  [":NSLocationAlwaysAndWhenInUseUsageDescription", "AgriCore uses location only for field-service workflows while you are using the app."],
];

for (const [key, value] of entries) {
  spawnSync(plistBuddy, ["-c", `Delete ${key}`, plist], { stdio: "ignore" });
  run(plistBuddy, ["-c", `Add ${key} string ${value}`, plist]);
}

spawnSync(plistBuddy, ["-c", "Delete :CFBundleURLTypes", plist], { stdio: "ignore" });
run(plistBuddy, ["-c", "Add :CFBundleURLTypes array", plist]);
run(plistBuddy, ["-c", "Add :CFBundleURLTypes:0 dict", plist]);
run(plistBuddy, ["-c", "Add :CFBundleURLTypes:0:CFBundleURLSchemes array", plist]);
run(plistBuddy, ["-c", "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string agricore", plist]);

run("npx", ["cap", "sync", "ios"]);

console.log("");
console.log("iOS project ready.");
console.log("Next: npm run mobile:ios:open");
