# Ngự Kiếm Vượt Thiên Quan — bản chơi thử v1

Mở **Top menu → Hoạt Động → Ngự Kiếm Vượt Thiên Quan**. Có **Bay thử** để chơi ngay và **Đua xếp hạng tuần** sau khi nhập môn và server đã kích hoạt. Bản thử dùng một mẫu nhân vật cưỡi kiếm theo ảnh tham chiếu; không đổi ngoại hình hoặc chỉ số nhân vật ngoài map.

## Cách chơi

Nhân vật tự bay tiến lên. PC rê chuột trên đường bay để đổi hướng, hoặc dùng phím trái/phải; Space tăng tốc. Mobile kéo ngang trên đường bay và chạm nút Tăng tốc. Điều khiển xử lý cả giao diện ngang và điện thoại đang xoay giao diện.

- Qua đủ chín cổng rồi tới đích. Lỡ cổng phải bay lại đoạn đó, cộng hai giây.
- Đá nổi, xoáy gió, sấm sét và chim cản đường: va chạm cộng hai giây, giảm tốc ngắn.
- Mỗi linh khí giảm 0,25 giây thành tích; viên hộ thuẫn còn chặn một va chạm. Đây là vật phẩm của lượt bay, không cộng vào ví nhân vật.
- Có ba lượt tăng tốc, mỗi lượt kéo dài 1,5 giây, chờ năm giây giữa hai lượt.
- Một lượt giới hạn ba phút. Có thể rời đường bay hoặc nhấn Escape; quay lại map bằng luồng tạm dừng/tiếp tục hiện có, không khởi tạo lại thế giới.

## Bảng tuần

Tuần mới bắt đầu 00:00 thứ Hai, giờ Việt Nam; mỗi tuần dùng một seed chung. Tất cả người chơi cùng đường đua và tốc độ cơ bản, không lấy chỉ số trang bị hay tốc độ ngự kiếm ngoài map. Bảng lưu lượt tốt nhất của từng tài khoản và hiển thị top 50, gồm cả tài khoản offline.

Server tự tính lại toàn bộ chuỗi điều khiển ở bước 50 ms: tốc độ, tăng tốc, cổng, va chạm, hộ thuẫn, linh khí và thời gian phạt. Không nhận điểm do client tự khai. Có kiểm tra phiên đăng nhập, thời gian tối thiểu, hạn lượt bay, quyền tài khoản và ghi kết quả một lần. Lượt quá thời hạn hoặc qua tuần mới phải bắt đầu lại. Chuyển ứng dụng/ẩn trang làm lượt đang bay không được xếp hạng; kết quả vẫn hiển thị để luyện tập. Mất mạng lúc gửi kết quả có nút gửi lại cùng lượt.

Replay hợp lệ chứng minh lượt bay tuân theo luật mô phỏng; nó không phân biệt thao tác người thật với phần mềm tự điều khiển. Bản này chưa cấp thưởng vật phẩm hoặc Tiên Ngọc theo hạng.

## Kích hoạt

Workspace chưa kết nối quản trị database live. Chưa áp dụng migration lên server thật.

- Server đã cài các tính năng online/BXH trước đó: chạy [supabase/sky-race.sql](../supabase/sky-race.sql) trong Supabase SQL Editor rồi triển khai client mới.
- Gói nâng cấp tổng [competition-upgrade.sql](../supabase/competition-upgrade.sql) cũng đã bao gồm mini-game này.
- Khi server chưa mở RPC, giao diện thông báo đúng trạng thái; **Bay thử** vẫn dùng được và không tạo hạng giả.

Kiểm tra riêng database: `npm run sky-race:verify`. Sinh lại gói tổng: `npm run competition:generate`.

## Sprite và hiệu năng

Dùng skill imagegen và công cụ tích hợp tạo [atlas PNG alpha](../public/assets/ui/sky-race-v1.png); [prompt và tọa độ khung](sky-race-art.json) được lưu cùng dự án. Ảnh thực 1448×1086, tám cột với các hàng cao khác nhau. Code dùng đúng vùng khung; giữ nguyên ảnh và alpha nguồn. [Bản WebP](../public/assets/optimized/ui-sky-race-v1.3803e67babf8.webp) giảm từ khoảng 2.919 KB xuống 1.145 KB, chỉ tải khi mở hoạt động.

Canvas vẽ khung nhìn hiện tại, dùng lại một atlas, nội suy hình ảnh giữa các bước mô phỏng; không tạo texture/particle theo từng frame. Độ phân giải theo DPR, giới hạn 2× và 1,5× ở chế độ máy yếu. Thế giới phía sau tạm dừng trong lượt bay. Chưa có số đo FPS trên Redmi Note 11 hoặc Safari iPhone thật.

## Kiểm chứng trình duyệt

[Ảnh bản chơi trên mobile](previews/sky-race-mobile.png) chụp từ game thật trong môi trường QA, dùng tài khoản thử và Postgres cục bộ.

- Sảnh nằm trong khung ở 1440×900, 844×390 và 640×360.
- Điều khiển bằng chuột hoàn thành đủ chín cổng, thu linh khí và gửi được replay qua RPC thật; kết quả đã được server xác nhận và hiển thị trên bục hạng ở sảnh.
- Điều khiển chạm đổi được vị trí bay; chạm khi điện thoại xoay giao diện vẫn đúng hướng.
- Thế giới tạm dừng khi vào đường bay; quay lại map và phím Escape giải phóng điều khiển đúng luồng.
- Không có lỗi JavaScript hoặc tải asset thất bại trong lượt kiểm tra hoàn chỉnh.

`sky-race:verify` đã đạt 17 kiểm tra SQL, trong đó so sánh replay client/Postgres trên 16 đường bay theo tuần, từ chối gửi quá nhanh/lượt hết hạn/sai tài khoản, chống nhận trùng và giữ kỷ lục tốt nhất.

Bộ kiểm thử toàn game đạt 523 test trong 103 file. Production build đạt, kiểm tra 84 ảnh giao tới trình duyệt và TypeScript; gói SQL tổng đạt thêm 34 kiểm tra giữ tương thích tỷ võ và hoạt động đã có.
