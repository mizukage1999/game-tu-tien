# Xem thông tin đối phương

Mở bảng bằng cách chạm nhân vật/tên người chơi trên bản đồ hoặc nút xem thông tin trong Bạn Bè. Giao diện dùng nền sân ngắm trăng, viền vàng và sprite đúng hệ nhân vật; người đang ở chương nhỏ dùng ngoại hình nhỏ tương ứng.

Các mục có dữ liệu hiện tại trong game:

| Mục | Nội dung |
| --- | --- |
| Tổng quan | Cảnh giới, cấp, tông môn/cấp bậc, khu vực, tổ đội, ID có nút sao chép, sinh lực, linh lực, thuộc tính và lực chiến. Có so sánh với nhân vật của bạn. |
| Trang bị | Sáu vị trí đang mặc, phẩm chất qua màu, cường hóa đúng từng món và chi tiết món được chọn. Chỉ xem, không có thao tác thay/nâng đồ đối phương. |
| Kỹ năng | Các kỹ năng đã mở của đúng hệ, cấp kỹ năng và chiêu đang dùng; ưu tiên bộ chiêu hiện tại ở đầu danh sách. |
| Ngự hành | Kiếm/hạc đã mở, trạng thái dùng, tốc độ theo cảnh giới và đạp không khi đạt Vấn Đỉnh. |
| Linh thú | Các linh thú đã thu phục, bậc, tiến hóa, chỉ số hỗ trợ và trạng thái đồng hành/nghỉ ngơi. Sáu loại có hình riêng. |
| Thành tựu | Lượt vượt bí cảnh, khu vực khám phá, thu hái, luyện chế và nhiệm vụ tông môn trong ngày game. Không tạo thứ hạng hoặc danh hiệu giả. |
| Quan hệ | Số hảo hữu và quan hệ với bạn, tông môn, tổ đội hiện tại. |

Thanh hành động có chat mật, mời tổ đội, kết/hủy hảo hữu và thách đấu. Nút không khả dụng được vô hiệu hóa khi đối phương ngoại tuyến; nhân vật nhỏ không thách đấu. Đóng bằng ×, Escape hoặc bấm ngoài bảng. Vùng nội dung cuộn riêng, thanh hành động luôn hiển thị. Menu đủ bảy mục ở các cỡ mobile đã kiểm tra.

## Dữ liệu online

`inspect:ask` / `inspect:result` sử dụng kênh social hiện có. Khi mở bảng hoặc nhấn ↻, máy đối phương tạo ảnh chụp thông tin công khai mới. Không gửi toàn bộ save, vật phẩm trong túi, ví tiền, email hoặc thông tin đăng nhập. Kiểm tra slot/ID vật phẩm, cấp cường hóa, kỹ năng theo hệ, chỉ số hữu hạn và kích thước danh sách trước khi render.

Mỗi lần xem có nonce riêng. Phản hồi sai người, sai nonce hoặc đến sau khi đổi người xem bị bỏ qua. Sau 6 giây không có phản hồi, bảng hiện trạng thái chưa lấy được thông tin; không thay bằng dữ liệu nhân vật của bạn. Hai máy cần tải cùng phiên bản để trả thông tin chi tiết. Luồng này vẫn dựa trên dữ liệu máy khách như kênh social hiện tại, chưa xác thực chỉ số bằng máy chủ chiến đấu riêng.

## Kiểm tra

- `npm.cmd test`: 44 tệp, 238 kiểm thử qua. `npm.cmd run build`, `npm.cmd run lint` và kiểm tra whitespace đều qua.
- Kiểm thử dữ liệu: chỉ xuất thông tin công khai, giữ cường hóa theo instance trang bị; chặn dữ liệu sai và phản hồi cũ; trẻ nhỏ không có kỹ năng/ngự hành/linh thú chiến đấu.
- Kiểm thử React: mở tab trang bị và kỹ năng, so sánh thuộc tính, gửi lời mời/tỷ võ, đóng bằng Escape, ngoại tuyến và giữ nguyên dữ liệu của người đang xem.
- Hai cửa sổ Chrome với relay Realtime mô phỏng cục bộ: chọn Sở Thiên/Hồng Liên, chạm sprite để mở bảng, nhận đồ +12 của đối phương, làm mới sau khi họ tháo vũ khí, hiển thị nhân vật nhỏ, gửi tổ đội từ bảng mới. Không có lỗi JavaScript chưa xử lý. Không dùng tài khoản thật hoặc gửi dữ liệu tới Supabase triển khai.
- Kích thước đã xem: PC 1440×900; mobile 844×390 và 667×375. Chưa kiểm tra trực tiếp trên iPhone vật lý.

## Ảnh giao diện

- [Tổng quan PC](previews/inspection-v1-overview-desktop.png)
- [Trang bị PC](previews/inspection-v1-equipment-desktop.png)
- [Trang bị mobile](previews/inspection-v1-equipment-844.png)
- [Mobile màn hình nhỏ](previews/inspection-v1-equipment-667.png)
- [Kỹ năng](previews/inspection-v1-skills-mobile.png)
- [Ngự hành](previews/inspection-v1-mounts-mobile.png)
- [Linh thú](previews/inspection-v1-companions-mobile.png)
- [Nhân vật nhỏ](previews/inspection-v1-child-mobile.png)

Hai ảnh mới nằm ở `public/assets/ui/cultivation/inspect-terrace-v1.png` và `inspect-companions-v1.png`, tạo bằng skill imagegen, công cụ tích hợp `image_gen.imagegen`. Câu lệnh đầy đủ, kích thước và thứ tự atlas lưu ở [player-inspection-assets.json](player-inspection-assets.json). Các hình nhân vật và icon dùng lại bộ sprite hiện có.
