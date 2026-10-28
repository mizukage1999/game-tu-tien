# Bảng Xếp Hạng — giao diện

Theo lựa chọn **giao diện trước, toàn server sau**. Mở từ **Thêm → Bảng Xếp Hạng** trên PC/mobile.

- **Của tôi** là mặc định: đọc chỉ số, trang bị, linh thú, cống hiến và số lần vượt phó bản từ nhân vật đang chơi. Thứ hạng ghi **Chờ mở**, không tự nhận hạng nhất server.
- **Xem mẫu** hiển thị 16 hồ sơ minh họa cho bục top 3, tìm kiếm tên tiếng Việt, hai trang danh sách và khung thông tin. Chế độ minh họa được ghi rõ tại thanh công cụ và khung chi tiết.
- Các tab: Lực Chiến, Cấp Độ, Cảnh Giới, Tông Môn, Phó Bản, Săn Boss, Linh Thú, Ngũ Hành. Tông Môn hiện trình bày cống hiến cá nhân. Săn Boss và Ngũ Hành chưa có số liệu thật nên để trống trong Của tôi; có dữ liệu minh họa khi Xem mẫu.
- Chọn người trên bục hoặc nút Xem để xem Thông tin / Trang bị / Linh thú / Ngũ hành. Mở Nhân Vật từ hồ sơ cá nhân đi đến tính năng hiện có.
- Màn hình tự co trên mobile; danh sách, chi tiết và thanh tab có vùng cuộn riêng. Màn hình rất hẹp chuyển sang bố cục dọc.
- Không gọi API BXH, không đọc save của người khác, không sửa save, không cấp quà hoặc thay đổi thành tích khi xem. Chưa có xếp hạng toàn server hoặc phần thưởng thứ hạng.

## Xác minh

- 11 kiểm thử liên quan qua: đọc chỉ số thật, tách dữ liệu minh họa, tìm tên không dấu, phân trang, chọn người, các tab chi tiết và mở từ menu Thêm; lint và build qua.
- Chrome/Canvas với backend giả lập: bố cục PC 1440×900, mobile 844×390 và 640×360; xác minh khung nằm trong màn hình, vùng chính không tràn ngang, chuyển trang/tìm kiếm/xem trang bị/linh thú/chuyển nguồn hoạt động, không có exception chưa xử lý.
- Mô phỏng trình duyệt không thay thế kiểm tra trên điện thoại thật.

## Asset

- Nền mới: `public/assets/ui/leaderboard-hall-v1.webp`, 1774×887, khoảng 365 KiB. Sinh bằng công cụ **imagegen tích hợp**, sau đó chuyển định dạng WebP để giao diện tải nhẹ hơn. Nền chỉ được dùng khi mở màn hình BXH.
- Biểu tượng: `public/assets/ui/menu-ranking.svg`, SVG gốc để đồng bộ màu vàng của menu hiện tại. Sprite nhân vật dùng lại atlas 8 nhân vật, không thay ngoại hình trong thế giới.
- Bản ảnh gốc được giữ tại thư mục đầu ra imagegen; bản dùng trong game đã nằm trong workspace.

Prompt cuối đã dùng:

> Create one production game background asset, stylized-concept illustration, for a Vietnamese xianxia cultivation RPG leaderboard Hall of Honor. This is an empty environment plate to be composited behind existing transparent character sprites and real HTML UI. Ultra-wide landscape panoramic composition, target 1536x768 or 2:1 ratio. Painterly detailed 2.5D Chinese immortal mountain pavilion at night, deep midnight navy, teal shadows, distant layered blue mountains and moonlight, warm golden lanterns, intricate black stone courtyard. Three clearly visible empty presentation pedestals across the lower middle: tallest large central gold pedestal for first place, slightly lower left silver-blue pedestal for second, right bronze-red pedestal for third. Leave central 75% clean and dark enough that three full-body character sprites will read clearly. Elegant arc of golden celestial dragon-shaped light subtly curling in the distant center background; delicate cool blue mist on left, a few copper sparks on right. Rich hand-painted fantasy game sprite aesthetic, premium ornate gold border sensibility but DO NOT draw an outer frame or any UI. Background only: NO PEOPLE, NO CHARACTERS, NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS, NO WATERMARKS, no cards or buttons. Keep the lower foreground simple, coherent architectural perspective and restrained lighting so characters can be overlaid without busy silhouettes.
