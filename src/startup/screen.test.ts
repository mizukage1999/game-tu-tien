// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { startupScreen } from './screen';

beforeEach(() => {
  document.body.innerHTML = `<div id="startup-splash"><span data-startup-status></span><b data-startup-value></b><div role="progressbar"><i data-startup-fill></i></div><p data-startup-detail></p><button data-startup-continue hidden>Continue</button><button data-startup-retry hidden>Retry</button></div><div id="root" inert aria-hidden="true"></div>`;
});
it('reports actual resource counts and frees input only when the entry UI commits', () => {
  const view = startupScreen();
  view.progress({ completed: 3, total: 6, failed: 0 });
  expect(document.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('3');
  expect(document.querySelector('[data-startup-value]')!.textContent).toBe('50%');
  expect(document.getElementById('root')!.hasAttribute('inert')).toBe(true);
  view.finish();
  expect(document.getElementById('startup-splash')).toBeNull();
  expect(document.getElementById('root')!.hasAttribute('inert')).toBe(false);
  expect(document.getElementById('root')!.hasAttribute('aria-hidden')).toBe(false);
  document.getElementById('root')!.setAttribute('inert', '');
  view.finish();
  expect(document.getElementById('root')!.hasAttribute('inert')).toBe(true);
});
it('lets a player continue on a slow network or retry failed resources', async () => {
  const view = startupScreen();
  view.allowContinue();
  const choice = view.waitForAction();
  document.querySelector<HTMLButtonElement>('[data-startup-continue]')!.click();
  expect(await choice).toBe('continue');
  view.assetsFailed();
  const retry = view.waitForAction();
  document.querySelector<HTMLButtonElement>('[data-startup-retry]')!.click();
  expect(await retry).toBe('retry');
});
it('keeps a failed module load visible and retryable rather than exposing an empty game', () => {
  const view = startupScreen();
  view.fatal();
  expect(document.querySelector('[data-startup-status]')!.getAttribute('role')).toBe('alert');
  expect(document.querySelector<HTMLButtonElement>('[data-startup-continue]')!.hidden).toBe(true);
  expect(document.querySelector<HTMLButtonElement>('[data-startup-retry]')!.hidden).toBe(false);
  expect(document.getElementById('root')!.hasAttribute('inert')).toBe(true);
});
it('does not report 100 percent while a resource still needs retrying', () => {
  const view = startupScreen();
  view.progress({ completed: 4, total: 4, failed: 1 });
  expect(document.querySelector('[data-startup-value]')!.textContent).toBe('75%');
  expect(document.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('3');
});
