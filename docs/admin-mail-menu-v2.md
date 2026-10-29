# Quà admin, thông báo và menu v2

## Cài lên server

Chạy toàn bộ [`supabase/admin-delivery.sql`](../supabase/admin-delivery.sql) trong Supabase SQL Editor. Yêu cầu server đã có `admin-operations.sql`, `admin-catalog.sql` và `alphatest-mail.sql` cùng các migration nền của chúng. File nâng cấp chạy trong một transaction; không tự gửi quà, thay túi hoặc bật bảo trì. Có thể chạy lại mà không xóa thư hay biên nhận cũ.

Workspace hiện chỉ có cấu hình public, chưa có kết nối quản trị database để chạy migration live. Dashboard mới chặn gửi vật phẩm nếu server chưa có luồng thư; không quay về cách cộng thẳng vào túi. Nút bật bảo trì yêu cầu server hỗ trợ báo trước 5 phút. Cài tiếp `supabase/player-access.sql` để cập nhật việc chặn admin trong game và kiểm tra tên mới; xem [hướng dẫn nâng cấp](player-access-v2.md).

## Quà và bảo trì

- Lệnh `item_grant` tạo đúng một thư cho người nhận, gồm tên vật phẩm, số lượng và lý do của admin. Biên nhận theo ID lệnh giúp thử lại không gửi trùng. Save, túi, entitlement và phiên chơi giữ nguyên khi thư vừa được gửi.
- Người chơi mở **Thư → Nhận vật phẩm**. RPC `claim_game_mail` xác minh chủ thư/phiên chơi, cộng vật phẩm một lần, tăng revision thư và trả lại save xác nhận. Đồ trang bị được tạo thành từng instance. Tiên Pháp Bảo chỉ có entitlement sau khi nhận thư. Quà admin nhận được trước nhập môn; thư Alphatest vẫn phải nhập môn.
- Khóa giao dịch theo thứ tự tài khoản → session → save → thư. Thử nhận lại sau mất mạng trả biên nhận; autosave cũ bị revision chặn. Hộp thư kiểm tra mỗi 30 giây khi tab đang hiển thị và khi quay lại tab, để người đang chơi biết có quà mới.
- Bật bảo trì tạo `maintenance_at = thời gian server + 5 phút`. Dòng thông báo chạy ngang ở vùng 23–26% chiều cao màn hình, kèm đếm ngược; không chặn bấm. Trong thời gian đó vẫn lưu/chơi bình thường. Đến hạn, server chặn tất cả tài khoản trong game, kể cả admin, và từ chối tạo phiên mới khi F5. Trang `/admin` vẫn dùng được để mở lại server. Tắt bảo trì hủy thời hạn và bỏ thông báo.

Mã nguồn SQL nâng cấp ở `scripts/sql/admin-delivery.template.sql`; các hàm điều hành được lấy từ `supabase/admin-operations.sql`. Sau khi sửa, chạy `node scripts/generate-admin-delivery-sql.mjs` để cập nhật file triển khai. Xác minh bằng `node scripts/verify-admin-operations-sql.mjs` với PostgreSQL PGlite cục bộ, không dùng dữ liệu live.

## Menu và điều khiển

- Nhân Vật chỉ còn Thuộc tính và Trang bị, bỏ các liên kết Kỹ năng/Linh thú/Tông môn và dải truy cập nhanh dưới cùng.
- Tiên Ngọc giữ các nội dung của ví/shop/lịch sử, bỏ toàn bộ thanh dẫn sang tính năng khác và phần Quản trị.
- BXH bỏ thanh trái và chỉ hiện 6 bảng: Lực Chiến, Cấp Độ, Cảnh Giới, Tông Môn, Săn Boss, Linh Thú.
- Săn Boss bỏ thanh dẫn sang màn khác, giữ các danh mục và chi tiết boss.
- Top menu bỏ Bày Bán, thêm lối mở Phó Bản và đưa Cài Đặt xuống cuối danh sách. Bày Bán vẫn nằm bên trong Giao Dịch hiện có.
- Click chuột vào thế giới hủy lộ trình nhiệm vụ/travel trước khi xử lý mục tiêu mới, kể cả điểm không có đường đi. Xóa ngay dấu chấm trắng và bỏ fallback tự vẽ lại đường tới nhiệm vụ chính. Nhiệm vụ vẫn giữ tiến trình; bấm lại nhiệm vụ để dẫn đường trở lại.

## Atlas icon

- File dùng trong game: [`public/assets/ui/top-menu-icons-v2.webp`](../public/assets/ui/top-menu-icons-v2.webp), **768×768**, khoảng **304 KiB**, lưới 4×4. Một atlas dùng chung cho 16 biểu tượng, giảm số request; mỗi icon có 192px, đủ cho nút PC/mobile mật độ cao.
- Sinh bằng **imagegen tích hợp**, không dùng CLI/API fallback. Ảnh nguồn được giữ tại `C:/Users/Hoa/.codex/generated_images/01a1676f-f99e-7e62-bf4d-ab13e8996bfc/exec-6b7bf385-6b92-4b78-bc59-365db6c38fc4.png`.
- Chỉ đổi kích thước/định dạng để giao tài nguyên. WebP giữ alpha chính xác sau resize: sai lệch tối đa **0**, góc của cả 16 ô có alpha 0, tổng 210.696 pixel hoàn toàn trong suốt. Không thêm nền đen bên ngoài khung tròn.
- `src/ui/MenuSprite.tsx` chọn ô bằng SVG viewBox. Không crop nội dung bằng xử lý màu đen hoặc blend mode; nền navy chỉ nằm trong huy hiệu.

Prompt đã dùng cho atlas duy nhất:

> Use case: stylized-concept. Asset type: ONE production sprite atlas for a Vietnamese xianxia 2.5D RPG HUD. Create a square 1024 x 1024 transparent PNG atlas containing exactly 16 separate ornate circular menu emblems, laid out in a STRICT 4-column by 4-row equal grid, each cell 256x256. No visible grid, no words, no letters, no numbers, no labels, no scenery or presentation board. True transparent alpha everywhere outside each emblem. Every emblem centered in its own cell, bounding size about 212 x 212, all with equal scale and at least 22px transparent gutter each side. Absolutely no overlapping adjacent cells. Rich hand-painted miniature game sprite art, crisp readable silhouettes, polished dimensional gold metal rims with a few angular ornamental points, navy recessed inner discs, jewel highlights, colorful luminous central objects, excellent readability down to 40px. The circular dark disc is allowed INSIDE the gold round rim only; outside the rim must be truly transparent, never a black square. Style: refined Chinese immortal cultivation game UI, same family across the complete sheet. Exact cell subjects in reading order (left to right, top to bottom): ROW 1: (1) handsome young Chinese male cultivator head portrait with long dark hair and white-blue robes in gold round portrait crest; (2) luminous sharp blue sword crystal with magical light; (3) bulging golden silk drawstring money pouch; (4) ivory ancient quest parchment scroll with red cord and small golden seal, no writing. ROW 2: (5) blue-roofed temple dungeon entrance with warm golden portal; (6) fierce crimson horned demon boss face with glowing orange eyes; (7) elegant multi-tier blue-roofed immortal sect pagoda; (8) luminous polished green jade spiral coin. ROW 3: (9) gold trophy cup with blue jewel; (10) round gilded mechanical settings cog; (11) golden-orange flame and meditating cultivator silhouette in a lotus; (12) enchanted blue mountain path winding into an ancient scroll, immortal journey emblem. ROW 4: (13) cream mail envelope closed with a red wax seal; (14) two clearly distinct blue human bust silhouettes, friends emblem; (15) antique gold balanced weighing scales for trade; (16) three small luminous gold diamonds arranged horizontally, more-menu emblem. All 16 cells MUST be present and in precisely this order. No extra icons, notification dots, badges, text, large decorative outer frame, fake checkerboard, shadow plates, opaque rectangle backgrounds, watermark. This is a usable transparent sprite texture, not a mockup.

## Xác minh

- Bản menu v2 ban đầu có 469 kiểm thử game qua. Kiểm tra hạn bảo trì mới và tên nhân vật được ghi riêng trong [bản cập nhật truy cập](player-access-v2.md).
- 46 kiểm tra PostgreSQL cho điều hành: quà chưa nhận không đổi túi/entitlement, thử gửi/nhận lại không trùng, không nhận được thư của người khác, nhận trước nhập môn, bảo vệ revision, thông báo bảo trì và chặn đúng hạn.
- Chrome/Canvas với backend QA cục bộ: chuột PC hủy lộ trình thật, dấu chấm không tự vẽ lại, bấm nhiệm vụ lần nữa khôi phục dẫn đường. Kiểm tra Nhân Vật, Tiên Ngọc, Săn Boss, BXH và menu Thêm tại 1440×900, 844×390, 640×360: khung không tràn ngang, số tab đúng và Cài Đặt ở cuối. Banner nằm ở nửa trên và không chặn input. Không có exception chưa xử lý.
- Đây là mô phỏng trình duyệt và database cục bộ; chưa chạy migration trên server live và chưa thay thế kiểm tra trên máy điện thoại thật.
