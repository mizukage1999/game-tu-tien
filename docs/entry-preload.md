# Màn hình chuẩn bị tài nguyên

Màn hình dùng ảnh tĩnh tiên cảnh do người dùng cung cấp; không có video, không
ấn định thời gian chờ 15 giây. Ảnh WebP khoảng 305 KiB nằm ở
`public/assets/ui/entry-preload-v1.webp`; bản PNG gốc nằm ngoài gói chạy tại
`art/startup/entry-poster.png`.

HTML hiển thị ảnh ngay trước khi tải xong React/Phaser. Luồng khởi động vẫn xác
nhận tài khoản và đồng bộ save trước khi import store, tránh lấy nhầm nhân vật.
Người chơi mới được chuẩn bị 17 ảnh cần cho Vương Gia Thôn: địa hình, NPC/cảnh
vật đóng gói, nhân vật khởi đầu và icon cơ bản. Tối đa ba ảnh tải/giải mã đồng
thời. Màn hình đếm ảnh thực sự sẵn sàng; ảnh lỗi không làm tiến trình lên 100%.

Các đối tượng ảnh đã giải mã được đưa trực tiếp vào texture của Phaser trong lúc
màn hình chuẩn bị còn hiển thị. Bước này không dựng thế giới hay cho quái đánh
người chơi sớm. Có nút tiếp tục để bỏ qua việc chờ; game vẫn có thể tải bổ sung.
Nếu một ảnh lỗi/treo, có thể thử lại; chỉ ảnh lỗi cần tải lại. Màn hình cũ không
che lỗi khởi động, và UI phía sau không nhận input khi màn hình chuẩn bị còn mở.

Sau khi đăng nhập, chọn nhân vật và tạo nhân vật, tài nguyên đã chuẩn bị được
dùng lại; nếu chọn phái khác chỉ cần bổ sung ảnh của nhân vật đó. Không tải cả
thư viện 8 phái, tất cả bản đồ, menu hoặc hiệu ứng chiến đấu ngay từ đầu. Save ở
bản đồ khác không tải Vương Gia Thôn thừa; bản đồ đích vẫn dùng loader theo vùng.
Màn hình đăng nhập/tiếp tục và lần vào thế giới đầu tiên dùng cùng ảnh nền; đổi
map trong game vẫn giữ màn chuyển cảnh hiện có.

Kiểm tra: unit test tiến trình, giới hạn đồng thời, timeout, retry, tái sử dụng
ảnh, danh tính/phái theo save và chờ GPU. Kiểm tra production bằng trình duyệt
với một ảnh bị chặn rồi cho tải lại; responsive 844×390, 568×280 và 390×844;
không có video/ngoại lệ runtime; vào làng không phát sinh request lần hai cho
những trang địa hình/nhân vật đã chuẩn bị. Đây là kiểm tra giả lập, chưa phải đo
hiệu năng trên điện thoại thật. Tải trước chuyển phần chờ ra ngoài; không loại
bỏ thời gian tải ban đầu, dựng map hoặc kết nối server.

APK: phiên bản 1.0.3, tạo lại bằng `npm run android:apk`.
