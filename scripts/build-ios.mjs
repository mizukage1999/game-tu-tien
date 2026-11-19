import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2] ?? 'simulator';
if (!['simulator', 'archive'].includes(target)) throw Error('Use simulator or archive.');
if (process.platform !== 'darwin')
  throw Error('Xcode builds require macOS. Use the manual iOS build workflow on GitHub; see docs/ios.md.');
const root = fileURLToPath(new URL('../', import.meta.url));
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const version = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
if (version.error) throw version.error;
if (version.status !== 0 || Number(version.stdout.match(/Xcode (\d+)/)?.[1] ?? 0) < 26)
  throw Error('Select Xcode 26+ using DEVELOPER_DIR or xcode-select.');
console.log(version.stdout.trim());
run('npm', ['run', 'ios:sync']);
run('plutil', ['-lint', 'ios/App/App/Info.plist']);
const output = path.join(root, 'artifacts/ios');
mkdirSync(output, { recursive: true });
const args = [
  '-project', 'ios/App/App.xcodeproj', '-scheme', 'App', '-configuration', 'Release',
  '-derivedDataPath', path.join(output, 'DerivedData'),
  '-destination', target === 'archive' ? 'generic/platform=iOS' : 'generic/platform=iOS Simulator',
  'CODE_SIGNING_ALLOWED=NO',
];
if (target === 'archive') args.push('-archivePath', path.join(output, 'CuuHuyen-unsigned.xcarchive'), 'archive');
else args.push('build');
run('xcodebuild', args);
console.log(target === 'archive'
  ? 'Unsigned archive ready in artifacts/ios/CuuHuyen-unsigned.xcarchive. Signing is required before iPhone installation/TestFlight.'
  : 'Simulator app ready in artifacts/ios/DerivedData/Build/Products/Release-iphonesimulator/App.app. This is not an iPhone installer.');
