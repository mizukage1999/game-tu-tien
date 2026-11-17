# Túi đồ: xác nhận thao tác và sprite theo phẩm chất

## Xác nhận

- Túi Đồ và Nhân Vật đều hỏi trước khi cường hóa: tên món, cấp hiện tại/cấp đích, số Đá Cường Hóa, tỷ lệ và hậu quả khi thất bại.
- Phân giải hỏi tên và cấp cường hóa của đúng món sẽ mất, nhận 2 Huyền Thiết và cảnh báo không khôi phục được.
- Hủy hoặc Esc không tiêu hao. Focus mặc định ở Hủy; Tab nằm trong hộp xác nhận. Esc không đóng cả túi đồ.
- Kiểm tra lại mã vật phẩm riêng, quyền sở hữu, cấp cường hóa và tài nguyên khi xác nhận. Yêu cầu cũ bị vô hiệu nếu món đã đổi. Chặn bấm xác nhận hai lần.
- Phân giải không nhận đồ đang mặc; khi xóa hết món sẽ dọn cấp cường hóa riêng và lưu ngay, không ảnh hưởng bản sao cùng loại.

## Hình ảnh và đóng gói

91 hình riêng có alpha thật, đủ 7 phẩm chất Trắng/Xanh/Lục/Tím/Cam/Đỏ/Hồng:

- 42 hình: kiếm, áo, mũ, giày, nhẫn, ngọc bội × 7 phẩm chất.
- 49 hình: linh phù, cung, song đao, hỏa ấn, hồn phiên, thiền trượng, ngọc giản × 7 phẩm chất. Vũ khí đúng phái.
- Từ đồ vải/sắt đơn giản đến giáp rồng, phượng và hoa sen; khác hình dáng và chất liệu. Mức +cường hóa vẫn hiển thị riêng trên đồ.
- Icon dùng chung cho túi, nhân vật, cửa hàng, xem đối phương và admin. Không thay chỉ số hoặc luật trang bị.
- Chỉ tải hình xuất hiện trong UI, không nạp thêm vào texture/loading map. WebP 192×192, tổng 1.474.894 byte cho 91 hình. Không đọc canvas để tạo icon lúc mở menu.

Tạo bằng **built-in image_gen**, sau đó cắt sprite, giữ alpha và đóng gói WebP:

- [Atlas trang bị](../public/assets/ui/equipment-tiers-v1.png)
- [Atlas vũ khí theo phái](../public/assets/ui/school-weapons-tiers-v1.png)
- [Toàn bộ prompt](equipment-icon-prompts.json)
- [Manifest runtime](../src/data/equipmentIconAssets.json)
- [Hash nguồn, vùng cắt và kiểm tra alpha](equipment-icon-encoding.json)

Tạo lại: `npm run assets:equipment`. Build kiểm tra đủ 91 hình khác nhau, hash, kích thước và alpha qua `npm run assets:verify`.

## Xác minh

- 27 tests qua: Hủy/Esc, focus/Tab, không thực hiện hai lần, từ chối yêu cầu cũ, chi phí khi thất bại, phân giải đúng bản sao và cường hóa từ cả hai giao diện.
- Trình duyệt production cô lập trên PC 1280×720 và mobile giả lập 844×390, 740×360: nút xác nhận vừa màn hình, hủy giữ đồ/đá, đồng ý trừ đúng, không có exception. Kiểm tra cả thao tác với mã vật phẩm riêng.
- TypeScript, ESLint và build production qua. Chưa thử trên điện thoại vật lý hoặc database thật.
