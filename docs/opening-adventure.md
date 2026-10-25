# Hành trình đầu tiên và trang bị riêng từng món

Đợt này hoàn thiện tuyến Vương Gia Thôn → nhập môn → học chiến đấu → Cổ Viện Ngọc Ấn → trở về trưởng lão → đột phá. Giữ HUD V5 cùng nền top menu trong suốt.

## Cốt truyện và hướng dẫn

Sau `main_3`, ba nhiệm vụ `first_prepare`, `first_boss`, `first_return` tự nối tiếp nhau. Nhiệm vụ chuẩn bị ghi nhận trang bị vũ khí, ba đòn đánh thường trúng đích, một kỹ năng, một lần lướt và Hồi Xuân Đan đã luyện. Thành tích trước khi nhận nhiệm vụ được tính; Auto không tính vào bài tập điều khiển tay.

Mỗi lần chỉ hiện một gợi ý nhỏ trong bảng nhiệm vụ hoặc bảng phó bản. Gợi ý có thể mở trang bị, tắt Auto, dùng đan, mở đúng bí cảnh hoặc dẫn đường về trưởng lão. Khi hoàn thành chương, gợi ý ẩn đi. Không thêm nút kỹ năng hay cửa sổ chặn di chuyển.

## Thử luyện đầu tiên

- Bản đồ riêng `pb_ngoc_an`: sân viện mở, hai hồ nước, cột đá và đào; điểm vào, bãi quái, boss và cửa ra có đường đi.
- Hai đợt linh vệ, mỗi đợt hai con. Boss Ngọc Ấn Thủ Hộ có 1.300 HP, báo vòng đỏ tại vị trí người chơi trước đòn đánh 1.700 ms; dưới nửa máu dùng chiêu thường xuyên hơn.
- Mốc cấp 4/lực chiến 500 là đề nghị. Mở bằng nhiệm vụ chuẩn bị, không khóa theo cấp, không giới hạn số lần thử lại.
- Thưởng lần đầu chắc chắn có Thanh Khê Kiếm (Lv.3, công +24, sinh lực +60), hai đá cường hóa và hai Hồi Xuân Đan. Vũ khí này không bán trong shop.
- Trở về báo Vân Hạc để nhận nguyên liệu Phá Cảnh Đan và nối tiếp `main_4`. Bản lưu cũ được bổ sung tuyến mới khi nhận sự kiện thế giới tiếp theo; nhiệm vụ đã làm được giữ nguyên.
- Khi thắng, lưu ngay tiến trình cùng vị trí trở về ngoài phó bản.

## Trang bị và cửa hàng

Trang bị thường dùng khóa riêng `baseId~token` trong túi và các ô trang bị; định nghĩa và hình ảnh tiếp tục dùng `baseId`. Hai thanh kiếm cùng loại có cấp cường hóa độc lập. Thay, tháo, cường hóa trong túi, chế tạo và nhận đồ rơi đều giữ từng món riêng. Tiên pháp bảo xác thực trên tài khoản vẫn là một vật phẩm duy nhất.

Bản lưu cũ chuyển đổi xác định và không lặp lại: giữ cấp cường hóa trên món đang mặc, hoặc món đầu tiên trong túi nếu chưa mặc; các bản sao khác bắt đầu +0. Giữ số lượng, tài nguyên và tiến trình. Cường hóa tối đa +12, dùng Đá Cường Hóa, thất bại giữ cấp hiện tại và tiêu hao đá.

Cửa hàng bán trang bị Trắng/Xanh/Lục; đồ Tím trở lên dành cho boss và bí cảnh. Yêu cầu cấp lấy từ từng món, tránh thông báo phẩm chất dùng mốc cấp cũ. Túi đồ và danh sách trang bị hiển thị riêng các món trùng loại cùng cấp cường hóa của chúng.

## Kiểm chứng

Kiểm thử bao phủ chuyển bản lưu cũ, tách cấp cường hóa của đồ trùng loại, thất bại cường hóa, tháo/đổi đồ và tải lại; chuỗi nhiệm vụ, mở bí cảnh, phần thưởng lần đầu, đường đi và gợi ý bằng các nút thật.

Kịch bản Chrome tại `.preview/opening-adventure-qa.mjs` dùng chạm thật để đánh thường, dùng kỹ năng, lướt và vào bí cảnh; sau đó điều khiển di chuyển/kỹ năng qua logic chiến đấu thật để đánh boss, né vùng báo đòn, trở về tông môn và trả nhiệm vụ tại NPC. Có kiểm tra bố cục iPhone xoay màn hình. Các bước chuẩn bị trước tuyến thử luyện được đặt bằng dữ liệu fixture; đây không phải phép đo toàn bộ thời gian chơi từ tạo nhân vật.

Tổ đội phó bản dùng chung trạng thái và xác nhận PK trên server là những hạng mục tiếp theo, chưa thuộc đợt thay đổi này.

Kết quả: toàn bộ 211 kiểm thử trong 37 tệp đạt; kiểm thử bổ sung cho cách nhận diện Tiên pháp bảo cùng nhóm trang bị/tông môn cũng đạt. Build và lint thành công. Luồng Chrome hoàn tất với Vương Lâm trên Canvas và Lý Mộ Uyển trên WebGL, gồm hạ boss, nhận đúng một Thanh Khê Kiếm, trở về và trả nhiệm vụ.

Ảnh kiểm tra: [hướng dẫn mobile](previews/opening-adventure-mobile.png), [boss và vùng báo chiêu](previews/opening-adventure-boss.png), [trang bị riêng từng món](previews/opening-adventure-gear.png).
