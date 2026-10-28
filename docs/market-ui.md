# Giao Dịch và Bày Bán

Đã áp dụng giao diện theo mẫu chợ tiên hiệp: nền phố đèn lồng, bảng màu xanh đêm và vàng, danh mục bên trái, bảng vật phẩm và biểu mẫu bày bán. Mở từ **Thêm → Giao Dịch** hoặc **Thêm → Bày Bán**.

## Phạm vi hoạt động

- **Mua bán:** dùng danh sách, số lượng và giá thật của NPC Tiền Đa Bảo. Có tìm kiếm không dấu, lọc loại/phẩm chất, yêu thích và phân trang. Mua qua hành động mua hàng hiện có của game.
- **Bày bán:** chọn vật phẩm thật trong túi, số lượng, đơn giá Tiên Ngọc hoặc Linh Thạch và thời gian. Bản nháp mới mặc định Tiên Ngọc; bản nháp cũ giữ đơn vị Linh Thạch. Lưu/sửa/xóa bản nháp theo tài khoản trên thiết bị. Không thu phí, cấp ngọc hoặc lấy đồ khỏi túi khi lưu nháp.
- **Trực tiếp:** xem trước hai bên, chọn người chơi trực tuyến, chuẩn bị tối đa 8 loại vật phẩm và số Linh Thạch. Chức năng xác nhận trao đổi chưa mở; không gửi lời mời hoặc chuyển đồ.
- **Lịch sử:** ghi lại các lần mua NPC thành công qua giao diện này trên thiết bị, tối đa 50 giao dịch.

Đây là bước giao diện trước theo lựa chọn của người dùng. Chợ người chơi và trao đổi vật phẩm qua server chưa được triển khai.

## Ảnh kiểm tra

- [Chợ giao dịch trên PC](previews/market-desktop-overview.png)
- [Danh sách vật phẩm trên PC](previews/market-desktop-buy.png)
- [Bày bán trên mobile](previews/market-mobile-stall.png)
- [Giao dịch trực tiếp trên mobile](previews/market-mobile-direct.png)

## Asset và prompt

Nền mới tạo bằng **công cụ imagegen tích hợp**, lưu trong dự án tại [public/assets/ui/market-night-v1.png](../public/assets/ui/market-night-v1.png), 1536 × 1024. Không dùng CLI/API. Icon vật phẩm và chân dung tái sử dụng bộ sprite hiện có. Toàn bộ nút, chữ và ô nhập được dựng bằng giao diện tương tác.

Prompt cuối:

```text
Use case: stylized-concept. Asset type: production background painting for the Trading Market and Player Stall menus of an existing Vietnamese xianxia RPG. Use the latest attached trade/stall reference as a style reference only. Generate one full-bleed 1536x1024 landscape illustration, crisp high-detail 2.5D painted fantasy Chinese night market. A beautiful lantern-lit temple-town street filled with several stalls displaying luminous spirit crystals, potion jars, scrolls, small gold bronze artifacts. Delicate pink cherry blossom trees, layered dark blue pagoda roofs, moonlit mountains behind, warm amber paper lanterns and jade accents. A white-robed young cultivator viewed from behind in the left foreground, a friendly elderly merchant behind a wooden counter at the right, a few small anonymous market-goers farther back. A central stone path leads deeper into the town. Composition follows reference: spacious upper-left quiet dark area for the real UI title; a striking market street at center and glowing stall at right; quieter bottom edge for real buttons. Fine material detail and clean silhouettes, dark navy/gold game aesthetic, natural perspective. Do not render any UI, text, title, price, numbers, letters, borders, watermark or logo. Only scene artwork; all menus and labels will be live HTML.
```

## Kiểm tra

- 380 tests / 67 files passed, bao gồm mua NPC đúng giá, bảo toàn túi đồ khi lưu/sửa/xóa bản nháp, tách bản nháp theo tài khoản, giới hạn vật phẩm và trạng thái xem trước trao đổi.
- TypeScript/Vite production build và ESLint cho các file thay đổi đạt.
- Chrome với backend QA riêng: mua NPC thực, lưu nháp bảo toàn đồ, xác nhận trao đổi bị khóa, không có lỗi JavaScript chưa xử lý.
- Kiểm tra khung 1440 × 900 PC; 844 × 390, 667 × 375, 915 × 412 mobile; 390 × 844 ở chế độ xoay ngang của game. Nút lưu nháp giữ trong khung trên màn hình thấp; nội dung biểu mẫu có vùng cuộn riêng.

## Điều khiển chuột trên PC

Đã hoàn tất kiểm tra tính năng di chuyển bằng chuột: bấm trái vào đất để đi tới điểm chọn, tìm đường tránh vật cản; bấm NPC để tiến tới hội thoại; bấm quái để chọn mục tiêu. Trong tỉ võ, bấm sàn để di chuyển tới vị trí chọn. WASD/phím mũi tên vẫn có thể dùng và sẽ ngắt đường đi bằng chuột. Joystick cảm ứng vẫn hoạt động trên mobile.

QA trong game đã xác nhận tọa độ click đúng khi camera zoom và màn hình Retina, nhân vật đến điểm chọn sau khi thả chuột, mở menu sẽ dừng di chuyển và chặn thao tác xuống thế giới, bấm phần thân NPC mở hội thoại thật, và click trên sàn tỉ võ tiếp tục di chuyển sau khi thả chuột. Không có lỗi JavaScript chưa xử lý trong các lượt kiểm tra này.
