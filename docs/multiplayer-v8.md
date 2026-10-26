# Đồng bộ online, nhân vật và giao tiếp — v8

## Thay đổi

| Mục | Hành vi hiện tại |
| --- | --- |
| Đánh quái online | Người cùng bản đồ nhận đòn đánh, hiệu ứng, máu, vị trí, chết và hồi sinh của cùng một quái. Chỉ người được ghi nhận hạ quái nhận thưởng; người đứng xem không tự nhận EXP/đồ. |
| Ngự kiếm | Đồng bộ trạng thái bay, độ cao, hướng kiếm và việc ẩn kiếm từ Vấn Đỉnh. Hai phía dùng cùng phép chiếu hướng. |
| Tỷ võ | Dùng sprite kỹ năng đã vẽ cho cả kỹ năng riêng và kỹ năng chung; bỏ lớp hình học thay thế hiệu ứng chiêu. Tự gửi lại trạng thái sẵn sàng nếu thông điệp đến trước khi chủ trận mở sân. |
| Nhân vật nhỏ | Cả tám nhân vật có ngoại hình nhỏ riêng ở Vương Gia Thôn, kèm chân dung tương ứng. Không đổi dữ liệu nhân vật của bản lưu cũ. |
| Hướng nhân vật | Tám hướng đứng/di chuyển và tư thế thi triển; hướng Bắc quay lưng. Vector đánh tính trong tọa độ bản đồ, hình vẽ tính trong tọa độ màn hình. |
| Tên trên đầu | Hiện cảnh giới trên tên người chơi và tán tu; không gắn Lv vào nhãn này. |
| PK | Ba nút dưới thông tin nhân vật: Hòa bình, Tông môn, Toàn bộ. Tông môn đánh người khác tông; Toàn bộ đánh cả đồng môn. Trẻ nhỏ được bảo vệ. |
| Chat | Chat gần trong bán kính 600 đơn vị bản đồ, có bong bóng trên đầu; chat mật chọn người nhận, biểu cảm và báo tin chưa đọc. |
| Lời mời | Biểu tượng thư giữa màn hình mở danh sách lời mời tổ đội/tỷ võ/kết bạn, có nhận hoặc từ chối trực tiếp. |
| Đăng nhập mobile | Form nhập theo hướng thật của thiết bị, không nằm trong lớp game xoay bằng CSS; ô nhập 16px và có cuộn khi bàn phím thu hẹp màn hình. |

HUD, hệ thống trang bị và bộ năm nút chiến đấu được giữ theo cấu trúc đang dùng. Bản đồ riêng và phó bản riêng vẫn là phiên chơi riêng.

## Kiến trúc và giới hạn

- Mỗi bản đồ công cộng có một người chơi được bầu làm chủ mô phỏng quái, ưu tiên người vào trước. Người còn lại nhận ảnh chụp trạng thái khoảng 150ms/lần. Khi chủ rời bản đồ hoặc vào tỷ võ, người còn lại tiếp quản trạng thái gần nhất. Phòng hết người sẽ khởi tạo lại khi có người vào.
- Đây là cơ chế đồng bộ giữa các máy khách trên Supabase Realtime hiện có, chưa phải máy chủ chiến đấu độc lập chống gian lận. Không yêu cầu thay đổi schema cơ sở dữ liệu cho bản sửa này. Các máy cùng chơi cần tải lại để dùng cùng phiên bản.
- Chat mật sử dụng khóa phiên P-256 ECDH, HKDF-SHA256 và AES-GCM; nội dung không truyền dưới dạng chữ thuần trên kênh chung. Khóa gắn với phiên hiện diện, chưa có bước xác minh khóa ngoài kênh. Hiện chỉ gửi đến người đang online; lịch sử giữ trong phiên, chưa có thư offline hoặc đồng bộ lịch sử nhiều thiết bị. Cách xây dựng dùng các API chuẩn trong [MDN deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey).
- Bộ ảnh PNG có nền trong suốt, tám hàng theo nhân vật và tám cột theo hướng. Di chuyển dùng chuyển động nhún nhẹ giữa các tư thế hướng để giữ hoạt ảnh gọn trên mobile, chưa phải chuỗi bước chân vẽ riêng từng khung. Đòn đánh có tư thế thi triển riêng.
- Trang web không thể bảo đảm bàn phím ngang nếu iOS đang khóa dọc hoặc trình duyệt không cho khóa hướng. Form mới loại bỏ sai tọa độ do xoay CSS; khi thiết bị ở ngang thì dùng form ngang và bàn phím do hệ điều hành cung cấp. Xem giới hạn hỗ trợ [WebKit Screen Orientation API](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/) và [WebKit iOS orientation lock](https://bugs.webkit.org/show_bug.cgi?id=257695).

## Kiểm chứng

- `npm.cmd test`: 42 tệp, 231 kiểm thử qua, gồm hai máy khách dùng chung quái, chuyển chủ mô phỏng, ghi thưởng một lần, sát thương PK, hướng/bay, dữ liệu mạng sai, mã hóa chat và bắt tay sẵn sàng tỷ võ.
- Kiểm tra trình duyệt: hai phiên Chrome độc lập ở 844×390, thao tác chọn Sở Thiên/Hồng Liên và các nút thật. Xác nhận chiêu hiện ở máy bên cạnh, cùng quái chết, người xem không nhận thưởng trùng, bay/hướng kiếm đồng nhất, ẩn kiếm ở Vấn Đỉnh, PK, chat gần đúng phạm vi, chat mật, nhận tổ đội, nhận tỷ võ và hiệu ứng thật trong trận.
- Kiểm tra form ở 390×844: form không xoay CSS, bấm mật khẩu lấy focus đúng ô. Không phát hiện ngoại lệ JavaScript ở hai phiên.
- Đường truyền trong lần kiểm tra trình duyệt được mô phỏng bằng BroadcastChannel phía cục bộ qua lớp thay thế Supabase phục vụ QA; không đăng nhập hoặc gửi dữ liệu đến tài khoản thật. Chưa kiểm chứng độ trễ/mất gói trên máy chủ Supabase triển khai hoặc bàn phím Safari trên iPhone vật lý.

## Ảnh kiểm tra

- [Nhân vật nhỏ tại Vương Gia Thôn](previews/online-v8-children-mobile.png)
- [Hiệu ứng kỹ năng phía người đứng xem](previews/online-v8-remote-skill-mobile.png)
- [Chat mật](previews/online-v8-whisper-mobile.png)
- [Lời mời giữa màn hình](previews/online-v8-invitation-mobile.png)
- [Sprite kỹ năng trong tỷ võ](previews/online-v8-duel-painted-mobile.png)
- [Form đăng nhập dọc theo thiết bị](previews/online-v8-auth-iphone.png)

Ảnh v8 được tạo bằng skill imagegen, công cụ tích hợp `image_gen.imagegen`; câu lệnh và cấu trúc atlas được lưu trong [provenance.json](../public/assets/heroes-v8/provenance.json).
