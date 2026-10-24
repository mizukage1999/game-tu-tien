# Settings interface

The Settings menu now uses the same full-screen navy/gold frame, wallet and decorative corners as the redesigned game menus. A new painted night-temple background appears in the sidebar and account card. All text, controls and line icons remain native UI.

Five working sections: **Chung**, **Đồ họa**, **Điều khiển**, **Tài khoản**, **Khác**. The general view combines display preferences, a short control guide and current language, with a real character/account summary and save actions in the right column. The remaining sections expand their respective details. Audio, multilingual localization, gift-code redemption, Steam/Epic linking and account deletion are not existing systems and are not presented as working controls.

Device preferences use a separate validated `tu-tien-device-settings-v1` key, independent of character/account saves. Invalid values fall back to safe defaults; brightness is clamped to 70–130%. Reset restores device preferences only. If storage is unavailable, preferences still apply for the current session and the footer explains that they cannot be retained.

- Quality changes the existing bounded render-density calculation and resizes the game buffer immediately, preserving the four-million-pixel budget.
- Brightness affects the world canvas rather than the HUD.
- Damage visibility controls combat damage numbers; progress/healing messages keep their existing behavior.
- Impact effects control hit flashes and sparks.
- Other-player names follow the setting during remote-player updates.

The account view uses the real session and existing guest-upgrade form. Offline copy is written for players and no longer exposes server setup commands. Sign-out saves first and reports failures inline. The profile uses the actual name, level, realm, map and registered sect; account ids are copyable when a session exists. Fullscreen appears only when the browser supports it.

Save and download actions dispatch `cmd:save` synchronously to the active World scene. Export downloads the current save snapshot as JSON without account credentials. The existing unload/automatic save behavior is retained. No progress deletion or import feature was added.

The two content columns scroll independently, while feedback/reset remains pinned inside the mobile and rotated-iPhone viewport. Artwork provenance and the complete built-in imagegen prompt are in `settings-ui-assets.json`.

Tests cover validation, the render budget, preference persistence/reset without character mutation, and retryable sign-out errors. Browser QA checks desktop, touch, small-phone and rotated-iPhone layout; actual buffer density, brightness, combat-number/effect/name suppression, reset, reload persistence and a real save download, all using isolated preview data with cloud disabled.
