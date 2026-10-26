# Tiên Lộ · Hành Trình Tu Tiên

Tiên Lộ dùng bố cục bản đồ bên trái, nội dung chặng bên phải theo ảnh tham khảo. Nền sơn hà mới có thôn làng, sơn môn, đan phòng, cổ điện và các vùng tu tiên; nút, tên chặng, đường đi và tiến độ là giao diện tương tác đặt trên nền.

Tám chặng bắt đầu từ **Vương Gia Thôn**, qua Bến Thanh Khê, Sơn Môn Khảo Hạch, Tiên Duyên Nhập Môn, Đan Đạo Khai Hỏa, Ngọc Ấn Thức Tỉnh, Ngự Kiếm Sơn Hà và Sơn Hà Rộng Mở. Đây là cách trình bày lại các nhiệm vụ hiện có, giữ thứ tự, điều kiện mở và phần thưởng của game. Save cũ không có phần tuổi thơ chỉ hiển thị các chặng thuộc cốt truyện của save đó.

Chặng hiện tại có chân dung đúng phái, dùng hình trẻ em trước khi nhập môn. Chặng đã đi qua có đường vàng, chặng chưa mở có khóa và vẫn cho xem trước. Thanh tiến độ và các mốc phía dưới tính bằng số nhiệm vụ thực sự đã hoàn thành.

Ba tab **Nhiệm Vụ**, **Cốt Truyện**, **Thưởng Chặng** lấy nội dung trực tiếp từ dữ liệu nhiệm vụ. Nút nhận nhiệm vụ dùng hành động nhận nhiệm vụ hiện có. Nút đến mục tiêu theo dõi nhiệm vụ và mở dẫn đường; nhiệm vụ cần trả vẫn dẫn về NPC. Tab thưởng hiển thị phần thưởng của từng nhiệm vụ cùng trạng thái đã nhận, không phát thêm thưởng. Khi đang bị hạ gục, ở phó bản hoặc vượt Thiên Kiếp, bảng hiển thị lý do chưa thể đi tiếp.

Thanh bên giữ các tính năng Đan Phòng, Động Phủ, Ngự Hành, Linh Thú và Sơn Hà Đồ. Các tính năng dành cho nhân vật trưởng thành tiếp tục khóa trong tuổi thơ. Danh sách nhiệm vụ cuộn riêng; bản đồ, tab, nút chặng hiện tại và nút đóng nằm trong khung trên PC lẫn mobile, kể cả giao diện xoay ngang trên điện thoại dọc.

Nền được tạo bằng **built-in imagegen**, lưu tại [journey-road-v2.png](../public/assets/journey/journey-road-v2.png). Prompt đầy đủ và kích thước thực tế nằm trong [journey-v2-assets.json](journey-v2-assets.json). Icon thanh bên là SVG trong mã nguồn.

Kiểm tra: **337 kiểm thử / 56 file**, build và lint thành công. Kiểm tra trình duyệt tại 1440×900, 1280×600, 844×390, 667×375 và 390×844 gồm bấm cả tám chặng, xem cốt truyện/thưởng, trở về chặng hiện tại, dẫn đường về NPC trả nhiệm vụ, chế đan với phản hồi và thay đổi túi đồ thật, các tab còn lại và nút đóng khi số dư tài nguyên lớn. Kiểm tra trình duyệt dùng backend giả cục bộ, không thay đổi tài khoản hay dữ liệu server.

Ảnh xem trước: [PC](previews/journey-v2-story-1440.png), [mobile](previews/journey-v2-story-667.png), [tiến độ chặng](previews/journey-v2-progress-667.png).
