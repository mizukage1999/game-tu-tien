# Hoạt Động — giao diện v2

Mở top menu **Hoạt Động** để chọn ba mục: **Thiên Giáng Dị Bảo**, **Động Phủ Viễn Cổ**, **Ngự Kiếm Vượt Thiên Quan**.

Giao diện dùng chung khung rồng vàng trên nền xanh ngọc đậm, ba tab có icon riêng, tranh bên trái và nội dung tương tác bên phải. Đồng hồ, map, cấp đề xuất, điều kiện tham gia và kỷ lục lấy từ dữ liệu hiện có. Chi tiết luật nằm trong nút **Xem chi tiết**; nút **Bảng Xếp Hạng** của ngự kiếm mở danh sách tuần ngay trong menu và có nút quay lại. **Bay thử** vẫn dùng được khi bảng tuần chưa kết nối.

Lần này chỉ thay phần trình bày. Dị Bảo/Động Phủ giữ lịch mở, điều kiện, phần thưởng qua thư và luồng vào map hiện có. Động Phủ hiện là hoạt động cá nhân; ngự kiếm mở mọi lúc và chưa có thưởng vật phẩm theo hạng, nên giao diện hiển thị đúng những thông tin đó.

## Artwork

Dùng skill imagegen với công cụ tích hợp, tạo mới từ ảnh người dùng làm tham chiếu phong cách. Không dùng CLI/API. [Prompt đầy đủ](activities-presentation-art.json).

- [Tranh ba hoạt động, PNG](../public/assets/ui/activities-scenes-v2.png), 1536×1024, ba cột. [WebP giao tới trình duyệt](../public/assets/optimized/ui-activities-scenes-v2.7d385479f2e5.webp), khoảng 595 KB.
- [Khung rồng vàng, PNG](../public/assets/ui/activities-frame-v2.png), 1536×1024, nền trong suốt. [WebP giao tới trình duyệt](../public/assets/optimized/ui-activities-frame-v2.aa1c696f80ca.webp), khoảng 319 KB. Code dùng border-image chín vùng để khung co theo kích thước menu.

Giữ nguyên ảnh và alpha gốc. Probe khung xác nhận 74,46% pixel trong suốt hoàn toàn; tâm và các góc ngoài đều có alpha 0. Các ảnh chỉ được yêu cầu khi mở menu tương ứng.

## Kiểm tra

- Hai kiểm thử hồi quy hiện có cho top menu và luồng ngự kiếm đạt, gồm Bay thử khi bảng tuần còn đang tải và giữ nguyên lượt thử khi phản hồi tới muộn.
- 42 kiểm tra UI qua fixture dùng component thật và dữ liệu RPC giả lập: ba tab, bảng tuần, nút đóng; khung nằm trong màn hình, không tràn ngang, nút chính thấy được mà không phải cuộn ở 1440×900, 844×390 và 640×360.
- Kiểm tra trực quan khung rồng, các dòng chữ trên mobile và vùng cắt icon. Không có lỗi JavaScript hoặc tải ảnh trong lượt kiểm tra UI. Đây không phải kiểm thử database live hoặc số đo FPS trên thiết bị thật.
- TypeScript và production build đạt; pipeline xác nhận 86 ảnh, kích thước atlas, hash nguồn và bản ghi alpha.

Ảnh xem trước dùng tài khoản/dữ liệu QA: [Dị Bảo](previews/activities-v2-treasure.png), [Động Phủ](previews/activities-v2-ruins.png), [Ngự Kiếm](previews/activities-v2-race.png).
