# Bảng Xếp Hạng

Mở từ **Thêm → Bảng Xếp Hạng** trên PC/mobile. Đã nối giao diện với RPC toàn server; cần cài [`supabase/leaderboard.sql`](../supabase/leaderboard.sql) trên Supabase để kích hoạt. Xem [hướng dẫn server](leaderboard-server.md).

- **Toàn server** là mặc định: cả online lẫn offline, lấy tiến trình đã lưu trên server. Tìm tên không dấu và chuyển trang giữ nguyên thứ hạng toàn server; top 3 luôn là top toàn server.
- **Của tôi** hiển thị vị trí thực của bạn, kể cả ngoài trang đầu. Khi chưa kết nối được, hồ sơ trên thiết bị hiển thị hạng **—** và ghi rõ nguồn.
- Các tab thật: Lực Chiến, Cấp Độ, Cảnh Giới, Tông Môn (cống hiến cá nhân), Phó Bản, Săn Boss, Linh Thú. Ngũ Hành chờ mở vì chưa có chỉ số gameplay được lưu. Dữ liệu mẫu không còn xuất hiện trong giao diện người chơi.
- Chọn người trên bục hoặc nút Xem để xem Thông tin / Trang bị / Linh thú / Ngũ hành. Mở Nhân Vật từ hồ sơ cá nhân đi đến tính năng hiện có.
- Màn hình tự co trên mobile; danh sách, chi tiết và thanh tab có vùng cuộn riêng. Màn hình rất hẹp chuyển sang bố cục dọc.
- Giao diện làm mới mỗi 30 giây khi đang mở và tab trình duyệt hiển thị; mỗi trang 8 người. Nút làm mới chủ động lưu nhân vật rồi đọc lại BXH. Không có phần thưởng thứ hạng.

## Xác minh

- Kiểm thử SQL bằng PostgreSQL trong bộ nhớ, so sánh công thức với game trên 8 hệ và 8 mốc cấp, kiểm tra dữ liệu offline, quyền riêng tư, khóa tài khoản, phân trang và đồng bộ save.
- Kiểm thử React cho danh sách toàn server, hạng cá nhân, lỗi mạng, tìm kiếm, đổi tab, hủy request cũ và làm mới.
- Chrome/Canvas nối RPC PostgreSQL cục bộ: 16 hồ sơ offline và 1 người đang chơi; kiểm tra top 3, hạng 9 ở trang hai, tìm tên không dấu, trang bị công khai, hạng 17 của bản thân và làm mới qua save. Bố cục được kiểm tra ở 1440×900, 844×390 và 640×360, không tràn khung hoặc có lỗi chưa xử lý.
- Mô phỏng trình duyệt không thay thế kiểm tra trên điện thoại thật.

## Asset

- Nền mới: `public/assets/ui/leaderboard-hall-v1.webp`, 1774×887, khoảng 365 KiB. Sinh bằng công cụ **imagegen tích hợp**, sau đó chuyển định dạng WebP để giao diện tải nhẹ hơn. Nền chỉ được dùng khi mở màn hình BXH.
- Biểu tượng: `public/assets/ui/menu-ranking.svg`, SVG gốc để đồng bộ màu vàng của menu hiện tại. Sprite nhân vật dùng lại atlas 8 nhân vật, không thay ngoại hình trong thế giới.
- Bản ảnh gốc được giữ tại thư mục đầu ra imagegen; bản dùng trong game đã nằm trong workspace.

Prompt cuối đã dùng:

> Create one production game background asset, stylized-concept illustration, for a Vietnamese xianxia cultivation RPG leaderboard Hall of Honor. This is an empty environment plate to be composited behind existing transparent character sprites and real HTML UI. Ultra-wide landscape panoramic composition, target 1536x768 or 2:1 ratio. Painterly detailed 2.5D Chinese immortal mountain pavilion at night, deep midnight navy, teal shadows, distant layered blue mountains and moonlight, warm golden lanterns, intricate black stone courtyard. Three clearly visible empty presentation pedestals across the lower middle: tallest large central gold pedestal for first place, slightly lower left silver-blue pedestal for second, right bronze-red pedestal for third. Leave central 75% clean and dark enough that three full-body character sprites will read clearly. Elegant arc of golden celestial dragon-shaped light subtly curling in the distant center background; delicate cool blue mist on left, a few copper sparks on right. Rich hand-painted fantasy game sprite aesthetic, premium ornate gold border sensibility but DO NOT draw an outer frame or any UI. Background only: NO PEOPLE, NO CHARACTERS, NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS, NO WATERMARKS, no cards or buttons. Keep the lower foreground simple, coherent architectural perspective and restrained lighting so characters can be overlaid without busy silhouettes.
