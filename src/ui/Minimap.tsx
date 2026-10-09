import { useEffect, useMemo, useRef } from 'react';
import { getMap } from '../game/maps';
import { TILE, type Terrain } from '../game/art/tiles';
import { useGame } from '../store/gameStore';

const COLORS: Record<Terrain, string> = {
  grass: '#5f9a48',
  flower: '#8fa86a',
  stone: '#a9adb8',
  path: '#c9b996',
  wall: '#2d3446',
  water: '#3478c0',
  platform: '#bfe6ff',
  dirt: '#7d6449',
  darkgrass: '#3f7340',
  bridge: '#9a6b42',
};

const SIZE = 132;

export function Minimap() {
  const mapId = useGame((s) => s.mapId);
  const mm = useGame((s) => s.minimap);
  const tile = useGame((s) => s.playerTile);
  const zone = useGame((s) => s.zone);
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useMemo(() => getMap(mapId), [mapId]);

  const background = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = map.width;
    c.height = map.height;
    const ctx = c.getContext('2d')!;
    map.terrain.forEach((row, y) =>
      row.forEach((t, x) => {
        ctx.fillStyle = map.blocked[y][x] && t !== 'water' && t !== 'wall' ? '#2f5a33' : COLORS[t];
        ctx.fillRect(x, y, 1, 1);
      }),
    );
    return c;
  }, [map]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const worldW = map.width * TILE;
    const worldH = map.height * TILE;
    // show a window of ~26 tiles around the player
    const span = 26 * TILE;
    const scale = SIZE / span;
    const ox = mm.player.x - span / 2;
    const oy = mm.player.y - span / 2;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#10141f';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0, map.width, map.height, -ox * scale, -oy * scale, worldW * scale, worldH * scale);
    const dot = (x: number, y: number, color: string, r: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc((x - ox) * scale, (y - oy) * scale, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const p of map.portals) {
      const [x, y, w, h] = p.rect;
      dot((x + w / 2) * TILE, (y + h / 2) * TILE, '#9fe3ff', 4);
    }
    mm.loot.forEach((l) => dot(l.x, l.y, '#7fd8ff', 1.5));
    mm.monsters.forEach((m) => dot(m.x, m.y, '#ff4d4d', 2.5));
    mm.npcs.forEach((n) => dot(n.x, n.y, '#ffd84a', 3));
    dot(mm.player.x, mm.player.y, '#ffffff', 3.5);
    ctx.restore();
  }, [mm, map, background]);

  return (
    <div className="minimap">
      <div className="minimap-title">
        {map.name}
        <span>
          ({tile.x}, {tile.y})
        </span>
      </div>
      <canvas ref={canvas} width={SIZE} height={SIZE} className="minimap-canvas" />
      {zone && <div className="minimap-zone">{zone.name} · linh khí x{zone.rate}</div>}
    </div>
  );
}
