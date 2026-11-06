import { useEffect, useRef, useState } from 'react';
import { OUTFITS, WEAPON_SKINS, type CosmeticLook } from '../data/cosmetics';
import { heroRow, type HeroId } from '../data/heroes';
import { optimizedAsset } from '../data/assetDelivery';
import { directionalAsset } from '../game/art/directionalHeroes';
import { HERO_DIRECTIONS, type HeroDirection } from '../game/art/heroDirections';
import { COSMETIC_HAND, COSMETIC_WEAPONS_URL } from '../game/art/CosmeticWeapon';
import { dyeGarmentCell } from '../game/art/garmentPalette';

const images = new Map<string, Promise<HTMLImageElement>>();
function load(url: string) {
  let request = images.get(url);
  if (request) {
    images.delete(url);
    images.set(url, request);
    return request;
  }
  const image = new Image();
  image.decoding = 'async';
  image.src = optimizedAsset(url);
  request = image
    .decode()
    .then(() => image)
    .catch((error) => {
      images.delete(url);
      throw error;
    });
  images.set(url, request);
  if (images.size > 4) images.delete(images.keys().next().value!);
  return request;
}

export function CosmeticArt({
  hero,
  look,
  kind = 'portrait',
  direction = 'down',
  id,
  className = '',
}: {
  hero?: HeroId;
  look?: CosmeticLook;
  kind?: 'portrait' | 'world' | 'icon';
  direction?: HeroDirection;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const render = async () => {
      const canvas = ref.current;
      if (!canvas) return;
      const weapon = WEAPON_SKINS.find((x) => x.id === id),
        outfit = OUTFITS.find((x) => x.id === (id ?? look?.outfit));
      const source = await load(
        kind === 'icon'
          ? weapon
            ? COSMETIC_WEAPONS_URL
            : '/assets/ui/cosmetic-robe-v1.webp'
          : kind === 'world'
            ? directionalAsset(hero!, false)
            : '/assets/heroes-v7/roster.png',
      );
      if (cancelled) return;
      const w = kind === 'world' ? 160 : kind === 'portrait' ? 384 : weapon ? 128 : 192,
        h = kind === 'world' ? 160 : kind === 'portrait' ? 512 : weapon ? 256 : 288;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      if (kind === 'portrait') {
        const row = heroRow(hero!);
        ctx.drawImage(source, (row % 4) * 384, Math.floor(row / 4) * 512, 384, 512, 0, 0, w, h);
      } else if (kind === 'world')
        ctx.drawImage(source, HERO_DIRECTIONS.indexOf(direction) * 160, 0, 160, 160, 0, 0, w, h);
      else if (weapon)
        ctx.drawImage(source, WEAPON_SKINS.indexOf(weapon) * 128, 0, 128, 256, 0, 0, w, h);
      else ctx.drawImage(source, 0, 0, w, h);
      if (outfit) {
        const pixels = ctx.getImageData(0, 0, w, h);
        dyeGarmentCell(pixels.data, w, h, { x: 0, y: 0, width: w, height: h }, outfit);
        ctx.putImageData(pixels, 0, 0);
      }
      if (kind === 'world' && look?.weapon) {
        const swords = await load(COSMETIC_WEAPONS_URL);
        if (cancelled) return;
        const index = WEAPON_SKINS.findIndex((x) => x.id === look.weapon),
          [x, y, dx, dy] = COSMETIC_HAND[direction];
        ctx.save();
        ctx.translate(80 + x, 150 + y);
        ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
        ctx.drawImage(swords, index * 128, 0, 128, 256, -14, -78 * 0.8, 28, 78);
        ctx.restore();
      }
    };
    void render().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hero, look?.outfit, look?.weapon, kind, direction, id]);
  return (
    <canvas
      ref={ref}
      className={`cosmetic-art ${className}`}
      role="img"
      aria-label={
        failed
          ? 'Chưa tải được hình ngoại trang'
          : kind === 'icon'
            ? 'Mẫu ngoại trang'
            : 'Diện mạo nhân vật'
      }
    />
  );
}
