# Skill sprites and status HUD, 2026-10-30

The active Vương Lâm library contains exactly seven signature arts: Hóa Ma Chỉ,
Đạo Hóa Hoàng Tuyền, Tịch Diệt Chỉ, Trảm La Quyết, Địch Linh Ấn, Định Thân Thuật,
and Luyện Hồn Thuật. Kiếm Pháp and Pháp Thuật categories and their common spells
are removed. The former ten Kiếm Tu class spells cannot be equipped, upgraded or
cast in world combat or manual PK. Basic attack and the independent dash remain.
Old identifiers are retained for save compatibility; loading automatically fills
retired loadout entries with the character's unlocked, available arts. Currency,
equipment and purchased skill levels are not deducted or reset. The sect no longer
offers the retired common secrets for contribution.

Seven new transparent effect sheets are in `public/assets/skills-schools-v2/`.
Each has ten skill rows and six animation columns (charge, form, release, impact,
scatter, dissolve). The actual damage windup determines the impact frame in the
world, online observer, menu preview and arena. All seven schools retain their
existing ten skill IDs, unlock levels, costs and combat mechanics. Source images
and exact generation prompts are recorded in [schools-v2-assets.json](schools-v2-assets.json).
Provider: built-in imagegen. Song Đao and Đạo Tu have been revised against the two
additional user references: violet/fuchsia twin blades and shadow afterimages for
Song Đao; blue/white yin-yang, time wheels, space portals and celestial stars for
Đạo Tu. The school label now reads Đạo tu and the two school accent colors match
these references. The ten existing skill IDs and combat parameters are preserved.
These two sheets use measured per-skill row gutters in `heroSpellArt.ts`, so icons,
previews and runtime textures crop the same complete effect without neighboring rows.

Distinct motifs include fire tornadoes, blood lotuses, dragons, phoenixes and chains;
soul banners, ghost rays, underworld gates and vortices; arrows, roots, stags and
trees; five-element pagodas, talismans and yin-yang seals; palms, bells, guardian
figures and Dharma wheels; twin blades, shadow lotuses and eclipse chains;
yin-yang waves, time wheels, celestial stars and space wards. Ground effects stay
centered; directed effects turn with the actual aim.

World buff icons appear below avatar/HP/MP and above quests. Arena icons appear
below each fighter's vitals. The HUD reads the real remaining shield, invulnerability,
root, defense weakening and slow timers; the latter two are currently arena states.
No fictitious duration is assigned to instant healing or to unimplemented buffs.
Each icon shows remaining seconds, an expiry ring and a focus/hover description.
Shield depletion, expiry and death remove the corresponding icon. Scene teardown
clears the world presentation store. Its 100 ms sampling does not run an independent
combat clock or save status effects to disk.

Delivery WebPs preserve the exact source alpha and atlas dimensions. Each loaded
school produces a 864 × 1440 runtime atlas with 60 frames, about 4.75 MiB of RGBA
pixels. Own-school loading and lazy loading for observed schools remain in place.
PNG masters are kept. Eight delivery variants add about 8 MiB of downloads across
all schools and the buff sheet, rather than loading every master PNG on game entry.

Validation covers retired-loadout migration and resource preservation, blocked
retired casts/upgrades, current school equip/swap/save behavior, six bounded atlas
frames and impact timing, two-peer combat replication, and buff countdown/depletion.
Browser inspection uses an isolated local relay, with no production database writes.

Initial seven-school update: 497 tests in 93 files passed; ESLint and the production build passed.
The build verified 82 delivery images, including source hashes, atlas dimensions
and unchanged alpha. Browser QA checked all seven runtime atlases and menus, real
shield expiry in the world, an online observer, actual manual PK casting and five
simultaneous status icons per fighter at 1440 × 900, 844 × 390 and 640 × 360.
These mobile sizes were emulated in desktop Chrome; physical Android/iPhone GPU
performance was not measured in this task.

Two-reference follow-up: after replacing Song Đao and Đạo Tu and measuring their
crop gutters, 52 related tests passed. ESLint and the production build passed again;
all 82 delivery images verified. Fresh two-client browser QA confirmed both new
atlases in the skill library, actual world casts, each nearby observer and manual
PK (including real MP expenditure), with no browser exceptions or failed assets.
Old generated delivery variants for these two replacements were removed after
verifying that the current manifest no longer referenced them. Original generation
paths and previous prompts remain recorded in the provenance JSON.
