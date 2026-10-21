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

## Tài khoản và save online

1. Tạo project tại [supabase.com](https://supabase.com), rồi mở **SQL Editor** và chạy toàn bộ [`supabase/schema.sql`](supabase/schema.sql)
   (bảng `profiles` + `saves`, RLS chỉ cho mỗi người đọc/ghi dữ liệu của mình, trigger tạo hồ sơ, hàm kiểm tra username).
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
- Chưa có multiplayer: hai người chơi không nhìn thấy nhau trong map.

## Điều khiển

| Phím | Chức năng |
| --- | --- |
| WASD / mũi tên / joystick | Di chuyển |
| J / Space | Tấn công thường (combo 3 đòn) |
| 1 · 2 · 3 | Băng Tâm Trảm · Phi Kiếm · Hàn Băng Trận |
| Shift | Thân Pháp (lướt, miễn sát thương ngắn) |
| E | Trò chuyện với NPC |
| F | Tọa thiền (nhanh hơn tại Linh Đài ×3, Linh Tuyền ×5) |
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
