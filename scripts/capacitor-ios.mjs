import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const [command, ...args] = process.argv.slice(2);
if (!['add', 'sync', 'open', 'run'].includes(command))
  throw Error('Use add, sync, open or run.');
if (['open', 'run'].includes(command) && process.platform !== 'darwin')
  throw Error('Opening/running the iOS app requires macOS and Xcode. See docs/ios.md.');
const result = spawnSync(process.execPath, [
  path.join(root, 'node_modules/@capacitor/cli/bin/capacitor'), command, 'ios', ...args,
], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CUU_HUYEN_NATIVE_PLATFORM: 'ios' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
