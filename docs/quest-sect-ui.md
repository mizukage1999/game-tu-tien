# Quest journal and sect interface

The quest menu keeps only **Tất cả** as its sidebar category. A status selector filters active, ready-to-return, finished or all accepted quests without creating extra categories. The list, illustrated detail header, objective checkboxes, progress and reward cards use actual `QuestLog` / `QuestDef` data. Unknown quest ids from older saves are omitted safely. Quest names and story text retain the existing female-origin localization.

Tracking uses the existing quest navigation source, now exposed through a small subscription and a React external-store hook. The HUD prioritizes a tracked active quest, including on mobile. Tracking never grants a reward or changes objective progress. Going to a quest dispatches the existing `cmd:questGo`, which closes the menu and uses the world routing system. Completed quests have no active claim/navigation button.

The sect menu has exactly five sidebar entries: **Tổng quan**, **Ghi danh**, **Nhiệm vụ**, **Cống hiến**, **Thành viên**. It shares the gold/navy fullscreen frame and wallet with the other redesigned menus. Overview shows the actual registered sect, personal rank, reputation, contribution and combat power rather than sample global clan levels or rankings.

Registration uses the existing `bindSect` action, at the chosen sect only, and updates the real death-return destination. Daily missions preserve the existing one-at-a-time and once-per-game-day rules; accepting/claiming and secret learning call the existing store actions. The five tasks have contextual travel, alchemy, dungeon or manual practice actions. Contribution purchases the two real elder secrets with their existing rank gates and 60 contribution fee. Rank advances automatically at the existing reputation thresholds.

The member tab lists the current character and online profiles that explicitly publish the same registered sect. Social presence now carries an optional validated `sect` field and refreshes after admission or a bound-sect change. Membership is never guessed from someone's current map; old clients with no sect field are omitted until updated. This is an online roster, not an offline membership database or a fake leaderboard. Profile buttons open the existing player card.

Two new paintings are recorded in `quest-sect-ui-assets.json`: mountain sect environment and a 3×2 scenery atlas. All text, buttons, frames, progress indicators and SVG symbols remain native UI. Lists/details scroll separately, and quest actions plus sect feedback/return actions remain inside the mobile viewport.

Verification includes quest tracking/navigation without granting rewards, actual registration, daily mission acceptance and one-time claim, contribution charging, member filtering and backward-compatible presence parsing. Browser QA uses isolated preview saves to check desktop, mobile touch, small-phone and rotated-iPhone layouts plus the real store transitions.
