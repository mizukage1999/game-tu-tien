# Dropdown PK và sprite cảnh giới

## Dropdown dưới avatar

- Thay dãy ba nút bằng một dropdown nằm dưới avatar, trước chữ có biểu tượng hai kiếm chéo.
- Hòa bình màu xanh lá; Tông môn màu cam; Toàn bộ màu đỏ. Màu dùng cho nút hiện tại và từng lựa chọn trong menu.
- Chọn mục cập nhật chính `player.pkMode`, dùng tiếp luật PK, đồng bộ online và bản lưu hiện có.
- Menu hiện trên lớp bảng nhiệm vụ, có thể đóng bằng bấm ngoài hoặc Escape. Có điều hướng bằng phím mũi tên, Home/End và hỗ trợ focus bàn phím.
- Nút lực chiến được bố trí cùng hàng bên phải; ở chương nhỏ, bên phải ghi Vương Gia Thôn.

## Cảnh giới trên đầu

Khung sprite có đủ 12 màu/cảnh giới theo thứ tự dữ liệu game: Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần, Anh Biến, Vấn Đỉnh, Âm Hư, Dương Thực, Khuy Niết, Tịnh Niết, Toái Niết.

Nhãn gồm tên cảnh giới, chip giai đoạn phía dưới và tên nhân vật ở dòng cuối. Không hiện Lv trên nhãn. Các giai đoạn chia theo mốc cấp đang có: 1–3 Sơ Kỳ, 4–6 Trung Kỳ, 7–9 Hậu Kỳ, mốc 10 Đại Viên Mãn trong mỗi đại cảnh giới. Ở mốc cuối chỉ hiện “Đại Viên Mãn”, không lặp thêm “Hậu Kỳ”. Đây là cách trình bày, không thay EXP, sức mạnh hay điều kiện đột phá.

Áp dụng cùng bộ hình cho nhân vật của bạn, người chơi khác, tán tu, nhãn trong tỷ võ và bảng xem thông tin đối phương. Trẻ nhỏ vẫn ghi Phàm Nhân. Người ngoài tổ đội vẫn mở được thẻ thông tin bằng cách chạm tên/khung cảnh giới.

Khung dùng một texture atlas chung, nền alpha trong suốt. Chữ là text thật để giữ dấu tiếng Việt và theo dữ liệu hiện tại. Kích thước quy đổi theo zoom và mật độ màn hình để gọn trên điện thoại. Khung giai đoạn cuối có nhịp sáng nhẹ, không thêm các vòng sáng hoặc hạt quanh thân.

## Kiểm tra

- `npm.cmd test`: 46 tệp, 254 kiểm thử qua. TypeScript, bản build production và lint đều qua.
- Kiểm thử mới bao phủ 12 cảnh giới × bốn giai đoạn, dữ liệu tên cảnh giới từ máy cũ, trạng thái phàm nhân, đổi mode qua dropdown, đóng ngoài và điều hướng bàn phím.
- Hai phiên Chrome với relay Realtime mô phỏng cục bộ: ba lựa chọn PK cập nhật đúng dữ liệu và đúng màu CSS, máy bên cạnh thấy thay đổi; nhãn local/remote hiện đúng cảnh giới/giai đoạn/frame sprite. Kiểm tra lần lượt đủ 12 frame và tán tu không hiện đè thêm dòng cảnh giới cũ. Không có lỗi JavaScript chưa xử lý.
- Đã xem ở 844×390, 667×375, 844×375 và PC 1440×900 với chế độ chuột. Chưa kiểm tra trên iPhone vật lý hoặc Realtime Supabase triển khai.

## Ảnh

- [Dropdown mobile](previews/realm-pk-dropdown-mobile.png)
- [Màn hình nhỏ 667×375](previews/realm-pk-dropdown-667.png)
- [Cảnh giới trên đầu trong game](previews/realm-pk-nameplates-mobile.png)
- [Bản PC](previews/realm-pk-nameplates-desktop.png)
- [Đại Viên Mãn](previews/realm-pk-final-realm-mobile.png)

Sprite mới: `public/assets/ui/cultivation/realm-crests-v1.png`. Tạo bằng skill imagegen, công cụ tích hợp `image_gen.imagegen`. Prompt đầy đủ, kích thước và thứ tự atlas lưu trong [realm-pk-assets.json](realm-pk-assets.json).
