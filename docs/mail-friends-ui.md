# Mail and friends UI

Mail keeps only **Tất cả**. It uses a new illustrated parchment and the shared navy/gold frame, wallet and responsive sizing. There is no mailbox source or claim API in this project; the screen deliberately remains empty and never creates sample mail, rewards or inactive claim/delete controls.

The social menu is now named **Bạn Bè** in both navigation and window title. It has only **Bạn bè** and **Lời mời**. The friend list uses the real saved references and live presence, with accent-insensitive name search, presence filters, online-first sorting, character portraits and profile selection. Level, realm and map are shown only when presence is available. Missing/disconnected profiles show unknown fields instead of fabricated stats or a guessed character.

Party invites, manual duel challenges, friend removal and invitation accept/decline use the existing social bridge. Friends can be removed while offline; inviting requires presence. The existing party leave/disband action remains reachable within the profile, including when the friend list is empty. No private-chat or gift system is implied by the artwork.

Portraits reuse the existing full-resolution character artwork with a separate head crop for avatars. Lists and profile details scroll independently; action buttons remain pinned within the mobile viewport. The return-to-map action closes the menu.

Artwork provenance and the full imagegen prompt are in `mail-friends-ui-assets.json`. Layout, labels, numbers, SVG symbols, search and action controls are native React/CSS.

Validation: two social interaction tests cover Vietnamese search, online filtering, loss of connection, real action dispatch, invitation decisions and removal confirmation. Local browser QA uses an isolated profile and synthetic preview data, never the player's save, and checks desktop, 844×390 touch, rotated 390×844 iPhone, empty states, invitation dismissal and layout bounds. Mail's single category and absence of fake reward controls are also checked.
