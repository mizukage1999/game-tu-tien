# Tối ưu lần đầu mở menu

Ngày kiểm tra: 2026-11-04.

## Nguyên nhân

- Menu đã có trong bundle, không chờ tải mã JavaScript khi bấm. Tuy nhiên CSS tải trực tiếp các PNG lớn, đi vòng ngoài `optimizedAsset()`. Ví dụ ảnh nền dùng chung là 2.26 MB; Tiên Lộ tải hai ảnh tổng cộng 7.31 MB.
- Tiêu đề một số menu tải một PNG riêng dù HUD đã tải atlas icon. Icon kỹ năng riêng còn kế thừa nền atlas kỹ năng chung không dùng đến.
- Bản đồ tiếp tục gửi lượt vẽ WebGL phía sau cửa sổ. Minimap và lớp hòa màu toàn màn hình cũng tiếp tục tạo việc cho trình duyệt. Cửa sổ lớn còn có hoạt ảnh dịch chuyển khi mở.

## Thay đổi

- Thêm 23 bản WebP giữ nguyên kích thước ảnh và tọa độ atlas, chất lượng mã hóa 0.92. Tổng dung lượng từ **66,704,862 xuống 12,776,116 byte**, giảm **80.85%**. Alpha được đối chiếu sau giải mã, chênh lệch bằng 0. Chi tiết và hash trong `runtime-asset-encoding.json`.
- Vite chuyển URL nền CSS sang đúng bản có hash trong manifest ở cả dev và production. Các ảnh JSX/SVG của nhân vật, xã hội, Tiên Lộ, phó bản, săn boss và Tiên Ngọc cũng dùng manifest.
- Tiêu đề tái sử dụng atlas icon của top menu. Icon kỹ năng chung dùng ảnh cắt sẵn; icon riêng không còn tải kèm nền atlas chung.
- Tải trước duy nhất nền menu dùng chung bằng request ưu tiên thấp tại màn hình vào game. Việc này không nằm trong điều kiện cho phép vào làng; không tải trước toàn bộ thư viện menu.
- Khi một menu che game, vòng lặp dùng bước cập nhật không vẽ của Phaser. Scene, timer, sát thương và vòng đồng bộ vẫn chạy. Khi đóng menu hoặc bắt đầu tải map, lượt vẽ hoạt động trở lại. Không dùng `scene.pause()` để mở menu.
- Không tính những bước cập nhật không vẽ vào bộ đo FPS. Bỏ hòa màu phía sau modal, giữ nguyên ảnh minimap cho đến khi đóng modal, bỏ hoạt ảnh trượt cửa sổ lớn và giới hạn phạm vi layout/paint của backdrop.

| Ảnh | PNG gốc | WebP |
| --- | ---: | ---: |
| Nền dùng chung | 2,262,537 B | 305,664 B |
| Giấy thư | 2,803,243 B | 405,522 B |
| Đường Tiên Lộ | 3,452,360 B | 673,368 B |
| Nền Cài Đặt | 2,159,064 B | 240,884 B |
| Cảnh phó bản | 3,123,565 B | 591,762 B |

## Kiểm tra

- Production build, TypeScript và ESLint.
- 55 kiểm thử hiện có cho chọn nhân vật, menu, kỹ năng, tu luyện, giao dịch, phó bản, săn boss, xã hội và cache ảnh.
- Trình duyệt production với backend offline, WebGL SwiftShader: **26 kiểm tra trên PC 1280×720 và 26 trên mobile mô phỏng 844×390**. Bao gồm mở đủ 18 menu trong viewport, timer và scene tiếp tục chạy khi không vẽ, khôi phục lượt vẽ khi đóng, tải lại map trong khi mở menu, sáu NPC sau khi tải và hủy renderer sạch. Không có JavaScript exception.
- Kiểm tra ảnh chụp giao diện Túi Đồ ở hai kích thước. Kiểm tra CSS bundle không giữ lại URL PNG đã có bản tối ưu.

## Giới hạn số đo

Các bài đo dùng cache bị vô hiệu hóa, CPU giảm tốc 4 lần, mạng 12 Mbps/60 ms và GPU phần mềm. Phân biệt thời điểm DOM xuất hiện, hai lượt `requestAnimationFrame` (chỉ là chỉ dấu, không phải số đo pixel đã hiện trên màn hình), và lúc tải xong ảnh. Kết quả GPU phần mềm còn dao động; không dùng chúng để cam kết thời gian mở menu hay FPS trên điện thoại thật. Chưa đo trực tiếp Redmi Note 11 hoặc iPhone. Việc dựng bản đồ và đồng bộ Auth/save khi đăng nhập là các phần riêng với độ trễ mở menu.
