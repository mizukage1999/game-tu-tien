# Tu Tiên Demo (offline)

Web game tu tiên chạy trên trình duyệt: Vite + React + TypeScript + Phaser 3 + Zustand.

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest cho các hệ thống thuần (combat, AI, loot, tiến trình, nhiệm vụ, lưu game)
npm run build    # kiểm tra kiểu + đóng gói vào dist/
```

Tiến trình được lưu vào `localStorage` (5 giây/lần, khi chuyển map và khi đóng tab). Xóa dữ liệu trong menu **設 Cài đặt**.

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
  store/         Zustand store: nguồn dữ liệu chung giữa Phaser và HUD React
  ui/            HUD, menu, hội thoại
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
