# Tu Tiên Demo

Web game tu tiên chạy trên trình duyệt: Vite + React + TypeScript + Phaser 3 + Zustand, có tài khoản và save trên cloud (Supabase).

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest cho logic thuần (combat, AI, loot, tiến trình, nhiệm vụ, lưu game, tài khoản)
npm run build    # kiểm tra kiểu + đóng gói vào dist/
```

Không cần cấu hình gì thì game chạy **offline** như cũ, tiến trình chỉ nằm trong `localStorage`. Xóa dữ liệu trong menu **設 Cài đặt**.

## Admin Dashboard

Mở **/admin/** trên cùng địa chỉ game. Dashboard có tra cứu tài khoản/túi đồ, danh mục vật phẩm/nhiệm vụ/boss, cấp Tiên Ngọc có xác nhận, kế hoạch sự kiện và nhật ký quản trị. Cần chạy [supabase/admin-dashboard.sql](supabase/admin-dashboard.sql) sau phần schema và Tiên Ngọc, rồi đăng nhập bằng tài khoản thuộc game_admins. Xem [hướng dẫn cài đặt và phạm vi hoạt động](docs/admin-dashboard.md).

Luồng quà admin qua Thư: cài thêm [supabase/admin-delivery.sql](supabase/admin-delivery.sql) sau các migration điều hành hiện có. Sau đó chạy [supabase/player-access.sql](supabase/player-access.sql) để báo trước bảo trì 5 phút và chặn mọi tài khoản trong game khi đến hạn, kể cả admin; `/admin` vẫn truy cập được. Bản này cũng yêu cầu tên nhân vật mới từ 6–16 ký tự và hiển thị menu PC thành 2 hàng. Xem [chi tiết cập nhật](docs/player-access-v2.md).

## Tài khoản và save online

1. Tạo project tại [supabase.com](https://supabase.com), rồi mở **SQL Editor** và chạy toàn bộ [`supabase/schema.sql`](supabase/schema.sql)
   (bảng `profiles` + `saves`, RLS chỉ cho mỗi người đọc/ghi dữ liệu của mình, trigger tạo hồ sơ, hàm kiểm tra username).
   Sau đó chạy [`supabase/single-session.sql`](supabase/single-session.sql) **trước khi dùng bản client mới**: mỗi tài khoản chỉ có một phiên chơi, đăng nhập sau đẩy phiên cũ ra và chặn phiên cũ ghi đè save. Áp dụng cả khi nâng cấp project đang có; xem [hướng dẫn phiên đăng nhập và HUD](docs/hud-sessions-v1.md).
   Tiếp tục chạy [`supabase/character-names.sql`](supabase/character-names.sql): giữ tên nhân vật duy nhất toàn server trước khi vào game. Tên trùng cũ được gắn hậu tố, giữ nguyên tiến trình; xem [tên nhân vật và tu luyện mới](docs/cultivation-v2.md).
   Chạy [`supabase/leaderboard.sql`](supabase/leaderboard.sql) để mở **BXH toàn server**, gồm nhân vật offline. Xem [cách cài, quy tắc và kiểm thử BXH](docs/leaderboard-server.md).
2. Trong **Authentication → Sign In / Providers**, bật **Anonymous sign-ins** và tắt **Confirm email**
   (tài khoản đăng ký bằng username dùng email nội bộ `@players.tutien.invalid` nên không nhận được thư xác nhận).
3. Chép `.env.example` thành `.env.local` và điền hai biến public:

   ```bash
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

   Chỉ dùng **anon key**. Không bao giờ đưa `service_role` vào client.

Khởi động lại `npm run dev`. Màn hình đầu tiên sẽ có ba lựa chọn:

- **Chơi ngay** — đăng nhập ẩn danh, vẫn có save trên server nhưng gắn với phiên trình duyệt này.
- **Đăng nhập** — bằng username *hoặc* email.
- **Đăng ký** — username + mật khẩu (không cần email, đăng nhập về sau bằng username), hoặc email + mật khẩu (đăng nhập bằng email).

Khách có thể vào **Cài đặt → Tài khoản** để nâng cấp thành tài khoản thật mà **giữ nguyên nhân vật** (`updateUser` gắn email + mật khẩu vào đúng user đang chơi).

### Save hoạt động thế nào

- Mỗi tài khoản có key `localStorage` riêng (`tu-tien-demo-save:<user id>`), nên hai người dùng chung máy không lẫn save.
- `saveGame()` ghi cache local rồi đẩy lên bảng `saves` (một request tại một thời điểm, save mới nhất thắng).
- Khi mở game, client so `savedAt` của local và cloud rồi lấy bản mới hơn — chơi lúc mất mạng vẫn không mất tiến trình.
- **Cảnh báo:** save nằm ở client và được client tin tưởng, nên người chơi sửa được save của chính mình. Muốn chống hack (PvP, xếp hạng) thì phải kiểm tra phía server.

### Giới hạn hiện tại

- Chưa có khôi phục mật khẩu trên UI và chưa có bảng xếp hạng.
- Guest xóa dữ liệu trình duyệt là mất đường vào nhân vật (dù save còn trên server).
- Có presence cùng map và tỷ võ điều khiển tay qua kênh social; chưa có máy chủ chiến đấu chuyên dụng hoặc phó bản chung nhiều người.

## Tiên Lộ · Thanh Vân Truyện

Đợt cập nhật chiến đấu, EXP, cường hóa, tông môn, linh thú, thiên kiếp và hướng dẫn bật Tiên Ngọc: [docs/combat-rework.md](docs/combat-rework.md).

### Bảy bản đồ và tuổi thơ Vương Gia Thôn

Nhân vật mới bắt đầu ở **Vương Gia Thôn**, với sprite Thiết Trụ hoặc Mộ Uyển nhỏ tuổi tùy nhân vật được chọn, cùng 10 nhiệm vụ về gia đình, việc làng, lời từ biệt và khảo hạch. Chưa nhập môn thì chưa mở chiến đấu, đan đạo hay tu luyện. Nhận lệnh bài ở Ngoại Môn sẽ chuyển sang nhân vật trưởng thành và nối vào nhiệm vụ Vân Hạc. Save cũ chưa có chương mở đầu cũng được đưa về làng một lần, giữ nguyên tu vi, vật phẩm và các nhiệm vụ đã có. Những lần vào sau tiếp tục tại vị trí đã lưu.

| Bản đồ mới | Bối cảnh và hoạt động |
| --- | --- |
| Vương Gia Thôn | Nhà gia đình, bàn mộc, giếng làng, ruộng rau, miếu, sông và gốc liễu; chương tuổi thơ |
| Ngoại Môn | Cổng lên núi, đài khảo hạch, người tiếp dẫn; nhận lệnh bài nhập môn |
| Linh Sơn Tông | Chính điện, các dãy viện, hồ sen và Chấp Sự; nhận nhiệm vụ khám phá |
| Đình Tạ | Hai đình, cầu đá, hành lang hồ sen và thạch thư; tọa thiền ×2 |
| Rừng Linh Thú | Đường mòn, trạm giữ rừng, linh dược và Thanh Mộc Thú |
| Thác Nước · Ngọc Tuyền | Song thác, cầu qua suối, cổ ấn và người giữ suối; tọa thiền ×4 |
| Bí Cảnh Thạch Linh | Hang tinh thể, cổ bia và Thạch Linh Thú; mở bằng duyên ngộ Ngọc Tuyền, tọa thiền ×3 |

Mở **Tiên Lộ → Sơn Hà Đồ** để xem địa hình, trạng thái khám phá và dẫn đường qua nhiều cổng. Nhánh khám phá có thêm 6 nhiệm vụ, bắt đầu từ Vân Hạc sau Tọa Thiền Ngộ Đạo. Các cổng dùng va chạm trong tọa độ bản đồ; dẫn đường chọn tuyến ngắn qua các cổng đã mở. Chỉ giữ một texture nền bản đồ tại một thời điểm để hạn chế bộ nhớ khi đi nhiều vùng.

Nguồn map: `src/game/maps/worldMaps.ts`; nội dung chương: `src/data/world.ts`; atlas và prompt: `public/assets/maps/`.

Sân Đại Thừa Viện có trục chính thông suốt, Linh Đài phía bắc, hai khu gặp NPC, vườn dược và sân luyện phía nam. Kiến trúc dùng atlas cột đỏ vàng, đèn lồng, cờ và lan can đá; vật thể cao mờ đi khi che nhân vật. Bố cục tại `src/game/maps/courtyard.ts`, atlas và prompt tại `public/assets/maps/`.

Sau chương mở đầu, **Tiên Lộ** tiếp tục với 3 chương tu luyện và 10 duyên ngộ cũ: từ linh ngọc cổ, học đan đạo, nhận động phủ đến Trúc Cơ, ngự kiếm và cứu Bạch Vân Hạc. Có thể nhận chỉ dẫn trong bảng cốt truyện hoặc trò chuyện với Vân Hạc; các nhiệm vụ cần trả vẫn phải về gặp NPC được chỉ định.

- **Hái dược:** đến gần Thanh Linh Thảo, Ngưng Lộ hoặc Linh Chi quanh sân viện và bìa rừng; chạm dược liệu hoặc nhấn **E**. Mỗi điểm hồi lại sau 25 giây, thời gian được lưu qua lần tải lại. Yêu Đan có cơ hội rơi khi đánh quái ngoài phó bản.
- **Đan Phòng:** luyện Hồi Xuân Đan, Tụ Linh Đan và Phá Cảnh Đan bằng nguyên liệu thực tế. Tụ Linh Đan dùng trong túi để tăng tu vi và linh khí. Đột phá đại cảnh giới cần thêm 1 Phá Cảnh Đan, bên cạnh điều kiện cảnh giới, tu vi và tài nguyên.
- **Động phủ riêng:** mở sau khi trả nhiệm vụ Lò Đan Khai Hỏa. Đây là bản đồ riêng, không quái và không tham gia kênh multiplayer. Có linh điền gieo/thu hoạch theo ngày game, tĩnh thất bế quan, lò đan chế tạo theo công thức và tụ linh trận; mỗi công trình nâng tối đa cấp 3.
- **Ngự hành:** mở Thanh Vân Kiếm sau duyên Trúc Cơ, mở Bạch Vân Hạc sau duyên cứu hạc. Thú cưỡi hiển thị dưới nhân vật và tăng tốc di chuyển; tấn công hoặc trúng đòn sẽ hạ xuống, phó bản tạm dừng ngự hành. Vẫn dùng lưới va chạm của bản đồ.

Tuổi và Thọ nguyên hiển thị riêng với tu vi; sống lâu không tự tăng sức mạnh. Chỉ trang bị vũ khí; đồ mặc cũ được trả về túi và có thể tái chế. Tán tu có tên, tu vi ẩn và chỉ xuất hiện ở vùng có quái. Sáu linh thú có chỉ số riêng, theo đường và hỗ trợ chiến đấu.

Tiến trình nằm trong các trường tùy chọn `player.immortal`, `player.life` và dùng cùng hệ thống lưu local/cloud hiện có. Save cũ tiếp tục đọc được. Nhánh nhiệm vụ đã hoàn thành được giữ nguyên; nhánh đan đạo mới có thể nhận sau nhiệm vụ Tọa Thiền Ngộ Đạo. Chi tiết cách chơi, đồng hồ và hình ảnh mới: [docs/cultivator-life.md](docs/cultivator-life.md).

Canvas mobile dùng mật độ tối đa 2×, giảm hệ số trên màn hình lớn để hạn chế bộ nhớ GPU. Camera tính lại khi thay đổi kích thước; tọa độ chạm được quy đổi cả khi giao diện xoay ngang bằng CSS.

## Phím điều khiển

| Phím | Chức năng |
| --- | --- |
| WASD / mũi tên / joystick | Di chuyển |
| J / Space | Tấn công thường (combo 3 đòn) |
| 1 · 2 · 3 | Băng Tâm Trảm · Phi Kiếm · Hàn Băng Trận |
| Shift | Thân Pháp (lướt, miễn sát thương ngắn) |
| E | Trò chuyện với NPC / hái dược liệu khi đứng gần |
| F | Tọa thiền (Linh Đài ×1, Linh Tuyền ×5, động phủ ×2–×5) |
| Tab | Đổi mục tiêu |
| Q | Dùng Hồi Xuân Đan |
| T | Bật/tắt tự động chiến đấu |
| Esc | Đóng cửa sổ |

## Phó bản và nâng cấp kỹ năng

- **Phó bản** (menu **秘**, hoặc nói chuyện với Lục Trần sư huynh): Băng Tuyết Động (Lv 5, 3 lượt/ngày) và Hỏa Diễm Cốc (Lv 12, 2 lượt/ngày).
  Mỗi phó bản có 3 đợt quái rồi tới thủ lĩnh, phải vượt trước khi hết giờ. Thủ lĩnh dậm đất theo vòng đỏ báo trước và triệu hồi thuộc hạ khi còn nửa máu.
  Vượt ải lần đầu có thưởng thêm. Tải lại trang khi đang trong phó bản sẽ đưa nhân vật về chỗ đã vào.
- **Nâng cấp kỹ năng** (menu **技**): mỗi kỹ năng lên tối đa cấp 10, tốn Linh Khí và Linh Thạch, từ cấp 4 trở đi cần thêm Kiếm Phổ Tàn Trang (rơi trong phó bản).
  Cấp 5 mở tuyệt kỹ riêng cho từng kỹ năng.
- Thông số nằm trong `src/data/dungeons.json`, `src/data/skills.json` (`growth`, `bonus`) và `src/data/monsters.json` (`boss`).

## Cấu trúc

Thư quà Alphatest và cách cài server: [docs/alphatest-mail.md](docs/alphatest-mail.md).

```
src/
  data/          JSON: quái, vật phẩm, kỹ năng, cảnh giới, nhiệm vụ, NPC, animation
  game/
    systems/     logic thuần TypeScript (có test), không phụ thuộc Phaser
    entities/    Player, Monster, LootDrop, Npc
    scenes/      PreloadScene, WorldScene
    maps/        MapBuilder + định nghĩa 2 bản đồ
    art/         đồ họa vẽ bằng Canvas 2D (nhân vật, linh thú, tile, decor, hiệu ứng, icon)
    anim/        AnimationController (hướng, khóa khi tấn công, frame gây sát thương)
    fx/          số sát thương, hiệu ứng trúng đòn, VFX kỹ năng
  net/           Supabase: client, phiên đăng nhập, auth, cloud save, boot
  store/         Zustand store: nguồn dữ liệu chung giữa Phaser và HUD React
  ui/            HUD, menu, hội thoại, màn hình đăng nhập
supabase/
  schema.sql     bảng profiles/saves, RLS, trigger và hàm kiểm tra username
```

Phaser gửi trạng thái lên store; React đọc store để vẽ HUD và gửi lệnh ngược lại qua `EventBus`.

## Thay đồ họa thật

Hiện tại mọi hình ảnh đều được vẽ bằng code khi khởi động nên game chạy được mà không cần tải tài nguyên nào. Muốn dùng sprite thật (ví dụ mua trên itch.io / CraftPix, hoặc tự vẽ):

1. Đóng gói thành atlas (TexturePacker, Free Texture Packer...) định dạng Phaser JSON Hash.
2. Đặt tên frame theo dạng `<anim>_<dir>_<index>`, ví dụ `run_side_0`, `attack_1_down_3`.
   Danh sách animation, hướng và frame gây sát thương nằm trong `src/data/animations.json`.
   Hướng `side` vẽ quay sang phải; game tự lật khi đi sang trái.
3. Chép file vào `public/assets/sprites/` và khai báo trong `manifest.json`:

   ```json
   { "player": { "atlas": "player.png", "json": "player.json" } }
   ```

   Khóa là tên nhân vật (`player`, `elder`, `merchant`, `disciple`, `hermit`, `beast_snow`, `beast_fire`).
   Số frame được đọc từ atlas, nên không cần đúng bằng số frame mặc định.

Ảnh đại diện trên HUD có thể thay bằng `public/assets/ui/portrait.png` (vuông, khoảng 128 px).
Nhớ ghi nguồn và giấy phép của tài nguyên bên ngoài vào `public/assets/CREDITS.md`.
