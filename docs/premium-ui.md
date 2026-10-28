# Tiên Ngọc

Mở từ **Thêm → Tiên Ngọc**. Đã làm lại giao diện theo mẫu: nền ngọc rồng xanh/vàng, số dư bên phải, lối tắt đến nạp, shop, lịch sử và cách nhận ngọc.

## Phạm vi

Đây là bước **giao diện trước, chợ thật sau**, theo lựa chọn của người dùng.

- **Tổng quan:** số dư khả dụng đọc từ tài khoản qua premium_status. Không tạo số dư khóa/tự do giả khi server hiện chỉ có một ví.
- **Nạp Tiên Ngọc:** 8 gói minh họa, gói ưu đãi, thẻ tháng/thẻ vĩnh cửu và quỹ trưởng thành. Giá/quyền lợi đều được ghi là tham khảo; nút mua/nạp bị khóa. Chưa có thanh toán, nạp thẻ, tự cấp ngọc hoặc quyền lợi thẻ.
- **Shop:** bộ lọc và chọn vật phẩm. Thiên Ngọc Tiên Ấn giữ nguyên giá 200 Tiên Ngọc và luồng đổi hiện có qua exchange_tien_ngoc. Chỉ đồng bộ vật phẩm khi server xác nhận. Vật phẩm tương lai có nhãn Sắp mở và chưa cho đổi.
- **Lịch sử:** đọc 50 giao dịch gần nhất từ premium_ledger, dùng chính sách RLS sẵn có giới hạn theo tài khoản. Hiển thị đúng dữ liệu hoặc trạng thái rỗng/lỗi, không tạo giao dịch mẫu trong game.
- **Cách nhận:** giải thích dòng Tiên Ngọc từ người mua sang người bán khi chợ mở; có lối tắt sang Bày Bán. EXP/Linh Thạch và vật phẩm nhặt không tự đổi thành Tiên Ngọc.
- **Bày Bán:** bản nháp mới mặc định niêm yết bằng Tiên Ngọc; có thể chọn Linh Thạch. Bản nháp cũ không có loại tiền vẫn được hiểu là Linh Thạch. Lưu/sửa/xóa bản nháp giữ nguyên đồ và số dư, chưa đăng bán hoặc chuyển tiền.
- Giữ công cụ cấp ngọc hiện có cho tài khoản được server xác nhận là admin.
- Ví và lịch sử bỏ phản hồi cũ khi chuyển tài khoản; số dư cũ không ghi đè kết quả đổi ngọc vừa xác nhận. Lỗi mạng hiển thị trong menu.
- Không đổi schema/server, không triển khai cổng thanh toán hoặc chợ người chơi trong lần này. Luồng ví hiện có cần supabase/combat-expansion.sql đã được cài trên server.

## Ảnh kiểm tra

- [PC: tổng quan](previews/premium-ui-desktop-overview.png)
- [PC: gói nạp xem trước](previews/premium-ui-desktop-topup.png)
- [PC: thẻ tháng](previews/premium-ui-desktop-month.png)
- [Mobile: shop](previews/premium-ui-mobile-shop.png)
- [Mobile: lịch sử](previews/premium-ui-mobile-history.png)

Số dư 500/300 trong ảnh là dữ liệu **backend QA riêng**, không phải ngọc được thêm vào tài khoản thật.

## Asset

Tạo bằng **imagegen tích hợp**, không dùng CLI/API:

- [public/assets/ui/premium-sanctum-v1.png](../public/assets/ui/premium-sanctum-v1.png): PNG 1536 × 1024, nền ngọc rồng trong sân tiên môn.
- [public/assets/ui/premium-bundles-v1.png](../public/assets/ui/premium-bundles-v1.png): PNG RGBA 1024 × 1536, 8 hình ngọc/túi/rương. Giữ nguyên alpha; đã xác nhận có 653.459 pixel hoàn toàn trong suốt. Sprite được cắt theo vùng thực tế để tránh lộ hình ở hàng kế tiếp.

Ảnh mới chỉ tải khi mở Tiên Ngọc; không thêm vào bước tải ban đầu của game. Nút/chữ/số dư/bảng lịch sử là UI tương tác, icon trang bị tái sử dụng bộ có sẵn.

Prompt nền:

```text
Use case: stylized-concept. Asset type: production background art for the premium currency menu Tiên Ngọc of a Vietnamese xianxia RPG, matching the latest attached reference. ONE full-bleed landscape 1536x1024 painted illustration. In the left-center, a large luminous emerald jade disc with a round hole and swirling spirit-light, cradled by an ornate antique gold dragon frame, sitting on a low stone lotus altar surrounded by several small mint green jade crystals. Behind is a beautiful dark blue Chinese temple courtyard with distant mountain spires, warm lanterns, subtle pink blossom branches at the edges, ancient stone steps. The jade disc is the focal point in the left 55%; keep the right 40% darker, quiet and spacious so we can overlay live balance controls. Fine crisp 2.5D hand-painted fantasy game art, elegant navy, emerald and antique gold palette, moonlit atmosphere, sharp readable details suitable for Retina mobile. No people, NO text, NO letters, NO numbers, NO interface, NO border, NO watermarks, NO logos. This is scenery only; title, balance, buttons and labels will be real interactive UI.
```

Prompt bộ sprite:

```text
Use case: stylized-concept. Asset type: TRANSPARENT sprite atlas of premium jade currency bundle icons for a Vietnamese xianxia RPG. Exactly 8 separate icons in a strict regular 2-column by 4-row grid, whole canvas 1024x1536, each cell 512x384. Each icon centered fully inside its own cell with generous 12% empty transparent padding. Top row left: a small cluster of luminous emerald jade shards and one round jade coin. Top row right: a rich blue silk drawstring pouch spilling luminous green jade coins. Second row left: a gilded treasure cup overflowing with emerald jade crystals and a few pink gems. Second row right: an ornate golden crescent-shaped cradle holding a large round green jade coin. Third row left: a small red and gold treasure chest open and filled with jade crystals. Third row right: a larger blue and antique gold chest overflowing with jade coins and green crystals. Bottom row left: an elaborate purple and gold treasure chest with abundant glowing emerald jade. Bottom row right: a magnificent large antique gold open treasure chest surrounded by piles of jade coins and emerald crystals. Consistent crisp polished 2.5D hand-painted xianxia inventory art, intricate gold trim, beautiful emerald green glow, readable isolated silhouettes. True transparent alpha background throughout, no black rectangles, no background scenery, no card borders, no cell borders, no shadows extending into neighboring cells. No text, no lettering, no numbers, no logos, no interface. Objects only.
```

## Kiểm tra

- 27 tests / 6 files đạt: ví/lịch sử khi đổi tài khoản, lỗi mạng, phản hồi số dư đến muộn, chặn đổi lặp khi đang chờ, không phát ngọc từ gói xem trước, đổi pháp bảo được server xác nhận, bản nháp Tiên Ngọc và tương thích bản nháp cũ, quyền sở hữu pháp bảo và menu.
- ESLint các file TypeScript thay đổi đạt.
- Chrome với backend QA cục bộ: xác nhận không tải ảnh premium trong bước vào game, gói nạp/thẻ chưa mua được, shop đổi đúng 200 và nhận đúng một pháp bảo, lịch sử có bản ghi -200, lưu bản nháp Tiên Ngọc giữ nguyên túi, lỗi mạng hiển thị trong menu; không có lỗi JavaScript chưa xử lý.
- Kiểm tra khung 1440 × 900 PC; 844 × 390, 667 × 375, 915 × 412 mobile; 390 × 844 qua chế độ xoay ngang. Đây là mô phỏng Chrome, chưa kiểm tra trực tiếp trên điện thoại.
- TypeScript/Vite production build và kiểm tra runtime asset đạt.

