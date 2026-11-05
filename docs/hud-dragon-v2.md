# Compact dragon HUD skin

The status, quest and party panels keep their existing PC and phone dimensions.
All names, school labels, bars, PK modes, objectives and party members use live
game data. Decorative layers ignore pointer events. No animation loop was added.

Assets generated using the built-in imagegen tool on 2026-11-05:

- `public/assets/ui/hud-dragon-rim-v2.webp`: 192 × 192, 18,270 bytes, transparent.
- `public/assets/ui/hud-cherry-bridge-v2.webp`: 768 × 256, 39,664 bytes.

Delivery images were resized and WebP encoded at quality 0.92 using Chrome's
canvas encoder. The rim supports a 60 px portrait at DPR 3. Both backgrounds
share the same scenery file. Original generated PNGs remain in the imagegen
output directory; only the two small delivery files are used by the game.

## Final generation prompts

### Dragon rim

Use case: stylized-concept. Asset type: production game HUD decoration sprite,
transparent PNG. Create ONE isolated circular gold dragon portrait FRAME ONLY,
no portrait. Vietnamese xianxia fantasy, hand painted polished metallic gold and
ivory highlights, intricate elegant long eastern dragon curling around a circular
rim, dragon head at upper left, horns and flowing whiskers arcing over the top,
slender tail curls under bottom right. Front-on flat UI orthographic design, not
isometric. Large completely transparent circular opening occupying center 70%
diameter, transparent outside as well. Gold dragon ring should be strong and
readable when displayed only 60 pixels wide. Restrained fine details, dark bronze
shadows, luminous warm gold edges, navy in tiny recesses. Frame centered with 4%
transparent margin, symmetrical circular opening despite asymmetric dragon. No
text, no lettering, no badges, no filled background, no character, no face, no
objects in the circular opening, no checkerboard. Matches a navy-and-gold Chinese
cultivation RPG HUD.

### Cherry bridge

Use case: stylized-concept. Asset type: reusable wide painted background strip
for a small navy-and-gold xianxia game HUD. Landscape aspect ratio approximately
3:1. A moonlit Chinese mountain village, arched stone bridge above a river,
graceful pink cherry blossom tree on the RIGHT, tiny traditional pavilion in deep
blue mountains behind it. All recognizable scenery confined to rightmost 45
percent, leftmost 55 percent nearly empty deep midnight teal/navy shadow fading
smoothly into scene, suitable for overlaying readable live text. Painterly high
quality fantasy RPG UI illustration, clear compact silhouette shapes, blue
moonlight, a few warm golden window lights, restrained pale pink petals.
Edge-to-edge painting, no gold border, no UI controls, NO TEXT, no letters, no
logos, no characters, no inventory objects. This is only a subtle background
surface behind live HUD data, not a UI mockup. Strong contrast on tree and bridge
at far right with dark left.
