# Game polish and PC profiling — 2026-11-05

## Server fix for level 283

The SQL public-profile catalog used the natural EXP limit (120) as its projection
limit. `game_rank_private.project` therefore reduced saved level 283 to 120 before
building the leaderboard entry. The client profile parser already accepted levels
up to 999.

The catalog now projects existing/admin profiles through level 999, using the last
defined realm for levels above the realm table. Stats still use the same game
formula; the natural EXP progression cap remains 120. No save or EXP is changed.

For an existing installation, run **`supabase/leaderboard-profile-levels.sql`** in
the Supabase SQL editor. This is a transaction that updates the catalog and
rebuilds public entries from current saves, including offline characters. It does
not alter private saves, timestamps, permissions, maintenance or rewards. The
full `leaderboard.sql` and `competition-upgrade.sql` installers are also updated.
This workspace change has not been applied to the remote database.

The embedded PostgreSQL check covers levels 283 and 999, client parsing, stat
parity, upgrading an entry previously capped at 120, and unchanged private saves
and timestamps. All 37 leaderboard checks pass.

## PC measurement and changes

Local isolated browser runs used Chrome with Intel HD 620/D3D, 1280 × 720, no CPU
throttle, 12 Mbps / 40 ms simulated network. Account/network RPCs were disabled;
these numbers do not measure live-server latency. Samples lasted seven seconds.

- Repeated `setDepth` calls marked the entire Phaser display list dirty even when
  actor coordinates were unchanged. Actor placement now only changes depth when
  necessary. The same stationary Ngoại Môn test went from 535 queued sorts to 0.
- Monster labels measured the player's container bounds repeatedly. The bounds
  are now shared within each frame, with a coarse distance rejection before
  measuring an overlapping monster label.
- Full-screen menus keep simulation/AI ticking but defer covered monster art,
  nameplate and health-bar updates until the next visible frame.
- The development CPU profile showed repeated Earcut polygon triangulation for
  the tiny rounded world HP bars. Their fills now use simple rectangle commands;
  HUD HP/MP bars keep their glossy rounded skin. Earcut/rounded Graphics rendering
  disappeared from the top 20 CPU samples in the subsequent village idle run.

| Village idle, dev build | Before bar change | After |
| --- | ---: | ---: |
| Average frame | 16.69 ms | 16.63 ms |
| 95th percentile frame | 19.70 ms | 19.00 ms |
| Longest sampled frame | 33.60 ms | 22.20 ms |
| Main-thread tasks above 50 ms | 0 | 0 |

The scene was already near the 60 FPS cap; these changes reduce wasted CPU work,
not a promise of 60 FPS on every PC. Measurements are single local samples and
vary between runs. First menu opens in the final dev sample (including two
animation-frame opportunities) were Character 261 ms, Skills 103 ms, Bag 84 ms,
Ranked 69 ms, Rankings 56 ms and Settings 110 ms. Character still has the largest
first-open cost. Deliberately hidden-world intervals between menu opens are not
included in frame-rate claims.

The browser harness observes menu availability with a 100 ms polling interval,
so menu timings are coarse observations rather than precise pixel-paint latency.
Final browser checks cover the 1280 × 720 desktop and 844 × 390 / 740 × 360 phone
layouts, including actual visible hit targets for Cancel, harvesting by mouse,
basic attacks damaging a live monster, and simulation continuing behind a menu.
The menu grid uses a bounded row so its content cannot push Cancel below the
phone viewport. Result: 12 browser checks, 15 unit tests and 34 competitive SQL
checks passed, alongside the 37 leaderboard checks.

## New artwork

Generated with the built-in **imagegen** tool; resized and WebP encoded using
Chrome canvas at quality 0.92. Source PNGs are retained in the imagegen output
directory. Project delivery files:

- `public/assets/ui/thanh-linh-thao-v3.webp`: 192 × 175, 12,430 bytes, alpha.
- `public/assets/ui/skill-basic-v3.webp`: 256 × 256, 25,916 bytes, alpha.
- `public/assets/ui/ranked-arena-v3.webp`: 1280 × 853, 181,672 bytes.

The herb is used in village, field and garden displays. Its root anchor and
harvest target match the sprite. The basic attack icon is shared by the existing
button without changing combat behavior or button size. Arena background artwork
loads only when its menu is opened. All ranked data and actions remain live.

### Final prompt — Thanh Linh Thảo

Use case: stylized-concept. Asset type: transparent background collectible herb
sprite for a 2.5D isometric xianxia RPG. ONE isolated small cluster of Thanh Linh
Thao healing grass, five graceful jade-green tapered leaves in a fan growing
naturally out of a tiny tuft of moss and two subtle gray stones, a slender central
pale lime-green shoot, a few turquoise dew beads. Hand-painted high quality game
prop, semi-realistic stylized botanical brushwork, shaded dimensional leaves with
fine veins and bright yellow-green edges, no plastic look, no outline, no neon
magical aura, no pot. View from slightly above at isometric angle, planted root
contact near bottom center, generous transparent margins, readable simple
silhouette at 60 pixels tall. Lush blue-green foliage, warm natural daylight like
an ancient Chinese village garden. Transparent exterior. No text, no frame, no
floor tile, no large background, no black rectangle, no checkerboard.

### Final prompt — basic attack

Use case: stylized-concept. Asset type: production RPG basic attack button icon
sprite. One circular icon centered with TRANSPARENT exterior outside the circular
badge. Xianxia Vietnamese fantasy, rich navy midnight blue enamel disk, elegant
thin double metallic gold ring. A crisp silver-blue straight sword diagonally from
lower-left to upper-right, polished gold crossguard, sharp ivory blade core, vivid
electric cyan sword-energy crescent sweeping behind the blade with three tiny
spark accents. Hand-painted premium game icon art, dimensional bevels, clear sword
silhouette recognizable at 64px. Balanced strong contrast, restrained glow inside
circle, no excessive tiny details. Entire badge visible with 3% transparent margin.
No lettering, no text, no numbers, no keyboard labels, no black square, no
checkerboard. Keep center uncluttered and sword clear, suitable as the large main
regular attack button beside six skill buttons.

### Final prompt — ranked arena

Use case: stylized-concept. Asset type: background illustration for Vietnamese
xianxia ranked PvP matchmaking screen. Landscape 3:2. Grand floating circular duel
arena at BOTTOM CENTER with fine gold tao yin-yang inlaid stone, two tiny warm lotus
braziers at left and right of platform, gold vertical light rising faintly from
arena. Blue mountain peaks and drifting pale mist at dawn, traditional pagoda roofs
flanking the middle distance, cherry blossom branches at top left and far bottom
right. Elegant premium hand painted 2.5D cultivation game art, midnight navy and
teal blue, luminous restrained gold accents, tiny pink petals. TOP CENTER should
have uncluttered dark navy negative space for overlaying UI. LEFTMOST and RIGHTMOST
25% dark unobtrusive mountains so dark information panels can overlay them. Empty
central arena with no characters. No HUD, no frames, NO TEXT, no typography, no
logos, no numbers, no badges, no portraits, no UI mockup. Entire image only the
scenic background, real controls will be added in code.
