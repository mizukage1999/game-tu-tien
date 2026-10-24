# Giao diện Kỹ Năng và Nhân Vật

Hai bảng dùng nền tông môn ban đêm, màu mực xanh và viền vàng theo hình tham chiếu. Nội dung vẫn là dữ liệu đang chơi, không có chỉ số hoặc vật phẩm mẫu được gắn cứng vào giao diện.

- **Kỹ Năng:** nhóm chiêu bên trái, lưới sprite ở giữa, chi tiết và xem thử bên phải. Chọn biểu tượng để xem mô tả, MP, tầm và hồi chiêu; chọn ô 2–4 ở thanh dưới rồi bấm **Dùng ở ô…**. Đánh thường và Lướt giữ vị trí riêng. Bộ lọc hiển thị tất cả, đang dùng hoặc chưa mở; bí thuật chưa học ghi rõ điều kiện. Nâng cấp dùng chi phí hiện có. Xem thử hoạt ảnh không tiêu hao MP và không đánh vào map.
- **Nhân Vật:** hình toàn thân của đúng nhân vật, sáu ô trang bị bao quanh, chỉ số thực tế và tiến trình cảnh giới ở cạnh phải. Chạm ô trang bị để xem đồ đang dùng, đồ phù hợp trong túi, tháo/trang bị hoặc cường hóa. Số đá, tỷ lệ, giới hạn +12 và kết quả dùng hệ thống hiện có. Các nút Kỹ Năng, Linh Thú, Tông Môn và Tu Luyện mở đúng mục tương ứng.
- **Mobile:** bảng vừa khung ngang và chế độ xoay từ màn dọc. Lưới chiêu và chi tiết có vùng cuộn riêng; thanh chọn ô và nút hành động luôn ở dưới. Phần tổng quan nhân vật được rút gọn để thấy cả cảnh giới. PC hiển thị đầy đủ các thông tin phụ.
- Nhân vật chưa nhập môn giữ hình tuổi thơ từ sprite đang chơi. Khi trưởng thành dùng ảnh toàn thân riêng của Vương Lâm hoặc Lý Mộ Uyển. Không đổi sprite di chuyển trong map.
- Biểu tượng skill mới được nạp cùng game và dùng lại trên HUD, trong tỷ võ và hai bảng này. Số Linh Khí/Linh Thạch lấy từ nhân vật; Tiên Ngọc lấy từ ví server hiện có.

Hình bitmap được tạo bằng **built-in imagegen**: nền, atlas 15 biểu tượng (5 cột × 3 hàng) và hai hình toàn thân có alpha. Tất cả file được lưu ở `public/assets/ui/cultivation/`; prompt, nguồn và đường dẫn từng file ở [cultivation-ui-assets.json](cultivation-ui-assets.json). Khung góc và biểu đồ thuộc tính dùng SVG; nút và chữ là thành phần HTML tương tác.

Kiểm tra: thao tác đổi chiêu, nâng cấp, tháo/trang bị/cường hóa; xem thử chiêu; bộ lọc và giới hạn theo nhân vật; không tràn ngang tại PC 1440×900, mobile 844×390 và iPhone dọc 390×844. Kiểm tra ảnh đầu tiên với WebGL, sau đó dùng Canvas cho các ảnh chụp tự động ổn định trong Chrome headless.
