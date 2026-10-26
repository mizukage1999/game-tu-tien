# Cân bằng nguyên liệu đột phá

Số Phá Cảnh Đan cần cho mỗi lần vượt đại cảnh giới được tính theo cảnh giới hiện tại, dùng chung trong bảng Tu Luyện, thông báo thiếu nguyên liệu và hành động bắt đầu Thiên Kiếp.

| Đột phá sang | Số viên cần |
| --- | ---: |
| Trúc Cơ | 1 |
| Kim Đan | 2 |
| Nguyên Anh | 4 |
| Hóa Thần | 8 |
| Anh Biến | 16 |
| Vấn Đỉnh | 32 |
| Âm Hư | 64 |
| Dương Thực | 128 |
| Khuy Niết | 256 |
| Tịnh Niết | 512 |
| Toái Niết | 1.024 |

Thiếu một viên cũng chưa thể bắt đầu. Toàn bộ chi phí được trừ một lần khi bắt đầu Thiên Kiếp; nhấn lại trong lúc vượt kiếp không trừ thêm. Vượt đủ thử thách mới tăng cảnh giới. Thất bại tiêu hao nguyên liệu đã dùng và giữ nguyên mức yêu cầu của cảnh giới đó khi thử lại. Toái Niết là cảnh giới cuối, không thu thêm đan.

Một viên Phá Cảnh Đan cần **6 Linh Chi, 4 Yêu Đan, 4 Ngưng Lộ và 120 Linh Khí**. Đan Phòng trong Tiên Lộ và lò đan Động Phủ cùng dùng một công thức. Xưởng kiểm tra và trừ Linh Khí của nhân vật, hiển thị đủ/thiếu ngay tại giao diện, và chỉ chế tạo khi đủ toàn bộ chi phí.

Nguồn nguyên liệu được chỉnh như sau:

- Yêu Đan chỉ dùng một lượt rơi từ bảng vật phẩm của quái. Bỏ lượt rơi cộng thêm 40%/80% trong cảnh chiến đấu vốn có thể cộng dồn với bảng rơi. Cả chế độ đơn và online dùng bảng này.
- Quái thường đủ điều kiện rơi Yêu Đan có tỉ lệ 10–18%, mỗi lần một viên; tinh anh 25–35%. Tỉ lệ tăng theo các dải cấp của quái. Boss đủ điều kiện có tỉ lệ 50–90%, mỗi lần 1–3 viên, hoặc 2–4 viên từ cấp 90. Thử luyện cốt truyện đầu tiên vẫn không có nguồn Yêu Đan lặp lại từ boss.
- Tỉ lệ rơi Linh Chi từ bảng quái tối đa 8%.
- Linh Chi ngoài bản đồ mọc lại sau 180 giây; Ngưng Lộ sau 60 giây. Thanh Linh Thảo giữ chu kỳ 25 giây.
- Dược điền Động Phủ thu hoạch lại sau 300 giây. Linh Chi gieo trồng cần 12 ngày game, Ngưng Lộ 6 ngày game; mỗi ngày game là 30 giây chơi.

Hạn hái thuốc tiếp tục lưu trong save. Luống đang trồng và nguyên liệu đã sở hữu được giữ theo tiến trình hiện có.

Kiểm tra tự động: **63 kiểm thử trong 8 file**, build và lint thành công. Có kiểm tra đủ 11 lần chuyển cảnh giới, thiếu một viên, trừ đúng chi phí một lần, thất bại/giới hạn tối cao, công thức và Linh Khí ở cả hai lò, bảng rơi quái, hạn hái sau lưu/tải lại và thời gian cây chín.

Kiểm tra trình duyệt cục bộ tại 1440×900, 667×375 và 390×844: hiển thị đúng 1.023/1.024 viên và khóa thao tác, bổ sung đủ để bắt đầu Thiên Kiếp và trừ đúng 1.024 viên, chưa tăng cảnh giới trước khi vượt kiếp. Đã chế tạo qua nút lò đan Động Phủ và xác nhận trừ nguyên liệu cùng Linh Khí thật. Backend kiểm tra là bản giả cục bộ, không ghi vào tài khoản server.
