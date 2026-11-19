import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Use the same plist parser already required by the pinned Capacitor CLI.
const cliRequire = createRequire(new URL('../node_modules/@capacitor/cli/package.json', import.meta.url));
const plist = cliRequire('plist');
const app = path.join(root, 'ios/App/App');
const info = plist.parse(readFileSync(path.join(app, 'Info.plist'), 'utf8'));
for (const key of ['UISupportedInterfaceOrientations', 'UISupportedInterfaceOrientations~ipad']) {
  assert.deepEqual(info[key], ['UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']);
}
assert.equal(info.UIRequiresFullScreen, true);
assert.equal(info.UIStatusBarHidden, true);
assert.equal(info.CFBundleDisplayName, 'Cửu Huyền');

const icon = readFileSync(path.join(app, 'Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
assert.equal(icon.subarray(1, 4).toString(), 'PNG');
assert.equal(icon.readUInt32BE(16), 1024);
assert.equal(icon.readUInt32BE(20), 1024);
assert.equal(icon[25], 2, 'App Store icon must be RGB without an alpha channel.');
const splash = JSON.parse(readFileSync(path.join(app, 'Assets.xcassets/Splash.imageset/Contents.json'), 'utf8'));
for (const image of splash.images.filter((image) => image.filename))
  assert(existsSync(path.join(app, 'Assets.xcassets/Splash.imageset', image.filename)));

const nativeConfig = JSON.parse(readFileSync(path.join(app, 'capacitor.config.json'), 'utf8'));
assert.equal(nativeConfig.webDir, 'dist-ios', 'Run npm run ios:sync, not cap sync using Android output.');
assert.equal(nativeConfig.appId, 'com.cuuhuyen.game');
assert.equal(nativeConfig.server?.url, undefined, 'The app must use bundled assets, not a development server.');
assert(nativeConfig.packageClassList.includes('AppPlugin'));
const publicDir = path.join(app, 'public');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(publicDir);
for (const file of files) {
  const relative = path.relative(publicDir, file).replaceAll('\\', '/');
  assert(!/(?:^|\/)(?:admin|\.env)(?:[/.]|$)/.test(relative), `Private/server file bundled: ${relative}`);
  assert(!relative.includes('AdminApp-'), 'The admin dashboard JS must not be bundled.');
  assert(!/\.(?:mp4|webm)$/i.test(file), 'The entry uses a still image, not a video.');
}
assert(existsSync(path.join(publicDir, 'assets/ui/entry-preload-v1.webp')));
const index = readFileSync(path.join(publicDir, 'index.html'), 'utf8');
assert(index.includes('startup-splash'));
const report = JSON.parse(readFileSync(path.join(publicDir, 'ios-assets-report.json'), 'utf8'));
console.log('iOS project verified:', { bundledFiles: files.length, ...report, icon: '1024x1024 RGB', orientations: 'landscape only' });
