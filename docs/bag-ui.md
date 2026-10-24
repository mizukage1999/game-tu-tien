# Túi Đồ và icon kỹ năng trong suốt

Túi Đồ dùng cùng nền, khung góc và bảng tài nguyên với Nhân Vật/Kỹ Năng. Cột trái chọn nhóm, giữa là lưới vật phẩm sáu cột và lọc phẩm chất, cột phải là hình lớn, thuộc tính, yêu cầu và thao tác.

- Có các chế độ Tất cả, Trong túi và Đang dùng. Đồ đang trang bị được đánh dấu, không bị cộng trùng vào số lượng trong túi. Đếm số loại sở hữu thực tế; không thêm giới hạn sức chứa giả.
- Sắp xếp theo phẩm chất, tên hoặc số lượng. Nhóm vật phẩm gồm vũ khí, phòng cụ, trang sức, đan dược, linh dược, nguyên liệu, bí quyển, pháp bảo và khác. Phẩm chất chỉ lọc dữ liệu phẩm chất đã có.
- Trang bị/tháo đồ, dùng đan, phân giải và cường hóa dùng hệ thống hiện có. Cường hóa cần Đá Cường Hóa, có tỷ lệ và tối đa +12. Kết quả hiện ngay dưới khung chi tiết. Đồ chưa đủ cấp có dấu khóa và ghi yêu cầu; so sánh chỉ số với đồ đang dùng.
- Nguyên liệu có nút đến đúng nơi sử dụng: Kiếm Phổ → Kỹ Năng; hạt giống → Linh Điền; công thức/Huyền Thiết → lò đan; linh thảo → Đan Phòng; thức ăn thú → Linh Thú. Không thêm tính năng khảm ngọc, độ bền hay chỉ số không có trong game.
- Trên mobile, nhóm, lưới và chi tiết có vùng cuộn; các nút dùng đồ vẫn hiện ở thanh dưới. Đã kiểm tra khung 844×390 và iPhone 390×844 xoay ngang, cùng PC 1440×900.

Atlas vật phẩm mới có 24 hình trên nền alpha. Mỗi hình được đọc theo vùng sprite riêng để không lẫn mảnh vũ khí hoặc tà áo ở ô bên cạnh. Biểu tượng mới cũng được dùng trong bảng nhân vật và các khu vực hiển thị cùng vật phẩm.

Atlas kỹ năng cũ có nền xanh đen đặc. Bản `skill-icons-alpha-v2.png` đã bỏ nền, giữ nét vẽ và vòng vàng, với khoảng trống thật giữa các hiệu ứng. Khi nạp, game giữ alpha và cắt theo đường tròn; HUD bỏ viền bóng đen dày. Lớp báo hồi chiêu và thiếu MP vẫn hoạt động. Kiểm tra PNG trong trình duyệt xác nhận cả 15 icon có góc alpha bằng 0 và khoảng 28–43% diện tích trong suốt; bốn chiêu chiến đấu và nút Lướt giữ số nút cũ.

Hai atlas được tạo/sửa bằng **built-in imagegen**, lưu tại `public/assets/ui/cultivation/`. Prompt, nguồn và đường dẫn từng file: [bag-ui-assets.json](bag-ui-assets.json).
