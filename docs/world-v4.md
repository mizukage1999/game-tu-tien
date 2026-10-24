# Bộ cảnh và bản đồ thế giới V4

Áp dụng phong cách từ ba bảng môi trường người dùng gửi: mái ngói xanh, cột đỏ viền vàng, cầu đá, hàng rào, đào, trúc, tùng, thác và các vùng tuyết/lửa/bí cảnh. Các bảng tham chiếu có chữ, khung và nhiều kích thước khác nhau, nên tài nguyên dùng trong game là các atlas sản xuất lại bằng imagegen tích hợp. Không dùng nguyên bảng ghép làm một sprite.

## Trong map

- `world-buildings-v4.png`: chính điện, lầu, cổng, tường, cầu đá và cửa hàng.
- `world-nature-v4.png`: đào, trúc, tùng, thác, cửa hang và tinh thể.
- `world-props-v4.png`: cột, cờ, đèn, lan can, bảng cáo thị, lư hương, chậu cây, sạp chợ, cầu gỗ và bụi thuốc.
- `world-materials-v4.png`: 12 vật liệu, gồm đất/cỏ/đá/nước/rừng/hang/tuyết/nham thạch/cổ trận. Vật liệu được ghép liên tục trong mặt phẳng isometric; không tăng số tile vật lý.
- `world-vistas-v4.png`: bốn cảnh xa cho sơn môn, rừng, hỏa vực và bí cảnh.

Map dùng chung bộ vật liệu mới, chọn nền theo khu vực. Sprite kiến trúc và thiên nhiên thay qua registry, giữ tọa độ và đa số footprint cũ. Đại Thừa Viện có thêm nhà hàng quán và sạp chợ, vẫn giữ lối đi đến các NPC. Vương Gia Thôn giữ nhà quê của bản thử trước và dùng vật liệu nền mới. Các rừng đầu game có cây trúc. Cắt khung kiến trúc theo biên đã kiểm tra để không mất mái và bậc thềm; giữ alpha gốc của PNG.

## Bản đồ khu vực và thế giới

`world-chart-v4.png` là nền minh họa Sơn Hà Đồ. Toàn bộ tên và điểm đến là HTML tương tác, dùng id và cổng thật trong game. Chọn nơi đến để xem mô tả, sau đó bấm **Dẫn đường**; không dịch chuyển tức thời. Khóa cốt truyện, nhập môn và danh vọng tiếp tục áp dụng. Cấp độ vùng vẫn là đề nghị, không chặn người cấp cao trở lại vùng thấp.

Có danh sách/lọc vùng, dấu vị trí hiện tại, chọn trên ảnh và thu phóng 100–200%. Mức 100% vừa toàn cảnh trong khung nhìn. Mobile rút gọn tên các điểm phụ và đặt thông tin/nút dẫn đường trong cột trái để dành diện tích cho hình.

Minimap và bản đồ khu vực lấy ảnh nhỏ của **địa hình và đạo cụ thật** khi tạo scene. Các chấm NPC, cổng, quái và người chơi được vẽ riêng, cập nhật theo trạng thái hiện tại. Cùng một phép chiếu dùng cho hình, ký hiệu và đổi tọa độ bấm, kể cả iPhone bị xoay bằng CSS. Chạm phần trời ngoài map không phát lệnh đi.

Ảnh thu nhỏ chỉ rộng 768px, bộ nhớ giữ tối đa sáu map. Nền chỉ ghép một lần mỗi lần vào map; cảnh xa dùng một ảnh. Không tạo bitmap toàn map trong vòng lặp update. Giới hạn buffer game bốn triệu pixel vẫn được giữ.

## Kiểm tra

- 187 kiểm thử đạt; thêm kiểm thử đổi tọa độ bấm qua mọi kích thước map, bỏ qua trời ngoài map, chọn nơi đến trước khi phát lệnh travel, khóa cốt truyện/danh vọng và quay về làng từ vùng cấp cao.
- Lint và build đạt.
- Chrome headless với profile riêng và cloud tắt: bấm Sơn Hà Đồ rồi đi thực tế qua các cổng tới Linh Sơn Tông; chạm map khu vực và đi đến đúng ô; dựng cảnh tông môn, rừng, thác, hang, băng và hỏa vực; bố cục PC/mobile/iPhone xoay.
- Chạy lại đủ 10 nhiệm vụ mở đầu, cả hai nhân vật khởi đầu, kéo chạm, hái thuốc, mờ cây che người và khôi phục độ đục.
- Kiểm tra Canvas và WebGL/SwiftShader, gồm mật độ điểm ảnh 2. Đây là kiểm tra trình duyệt giả lập, không phải đo FPS điện thoại thật.

Script: `.preview/world-v4-qa.mjs`, thêm `--webgl` cho lượt dựng hình WebGL; `.preview/village-25d-qa.mjs` cho nhiệm vụ mở đầu. Dùng server preview cô lập cổng 5177.

[Danh sách asset, nguồn và prompt đầy đủ](world-v4-assets.json).

- [Sơn Hà Đồ PC](previews/world-v4-atlas-pc.png)
- [Sơn Hà Đồ mobile](previews/world-v4-atlas-mobile.png)
- [Bản đồ khu vực](previews/world-v4-local.png)
- [Rừng trúc trong game](previews/world-v4-forest.png)
