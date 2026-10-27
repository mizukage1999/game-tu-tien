import { expect, it } from 'vitest';
import { optimizedAsset } from '../../data/assetDelivery';

it('selects hashed delivery images and keeps original URLs when no variant exists', () => {
  expect(optimizedAsset('/assets/heroes-v8/children.png')).toMatch(
    /^\/assets\/optimized\/.*\.[a-f0-9]{12}\.webp$/,
  );
  expect(optimizedAsset('assets/heroes-v8/children.png')).toBe(
    optimizedAsset('/assets/heroes-v8/children.png'),
  );
  expect(optimizedAsset('/assets/custom.png')).toBe('/assets/custom.png');
  expect(optimizedAsset('https://example.test/image.png')).toBe('https://example.test/image.png');
});
