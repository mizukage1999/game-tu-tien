# Vương Gia Thôn — bản thử 2.5D

Map mở đầu dùng bộ nhà ngói xanh, sân mộc, giếng, miếu nhỏ, cầu gỗ, liễu và đào mới. Vật liệu cỏ, đường đá, đất vườn và nước được vẽ liên tục theo mặt phẳng isometric. Bóng tiếp xúc, ánh sáng sớm và cảnh thung lũng phía xa tạo chiều sâu. Nhân vật đi sau nhà/cây vẫn dùng cơ chế làm mờ vật che.

Camera làng nhìn về phía trước nhân vật thêm 72 đơn vị để thấy đường và mái nhà; nhân vật nằm thấp hơn tâm màn hình, giúp khung mobile có nhiều khoảng nhìn phía trước.

Giữ góc nhìn cố định của Phaser, kích thước map, điểm xuất phát, NPC, vị trí mục tiêu, cổng và dữ liệu nhiệm vụ hiện tại. Các vật trang trí lớn được đặt rõ vị trí; bỏ cây ngẫu nhiên trong làng để giữ đường nhiệm vụ dễ nhìn. Hai cầu vẫn đi được cả hai chiều. Bộ hình mới áp dụng cho Vương Gia Thôn.

Linh thảo nhiệm vụ dùng hình vẽ cùng bộ, có vùng chạm theo kích thước sprite. Chỉ hiện tên linh thảo gần nhất và tên điểm tương tác khi ở gần để giảm chữ trên mobile. Bỏ tên địa điểm lớn vẽ đè trên đường làng; tên map vẫn nằm trên minimap.

Tên nhân vật, NPC, linh thú và nhãn trong WorldScene đặt `resolution` ngay trong Text style. Phaser Canvas đọc tỉ lệ từ texture source; gọi `setResolution` sau khi tạo chỉ cập nhật style, khiến chữ lớn gấp đôi trên Canvas. WebGL tiếp tục dùng đúng kích thước thiết kế.

Nền và bóng được ghép vào một texture khi vào map. Cảnh xa dùng một ảnh với chuyển động nhẹ theo camera. Không tạo canvas nền trong vòng lặp update. Giữ giới hạn bốn triệu pixel của bộ đệm hiển thị.

## Kiểm tra

- `npm run lint`, `npm test` (182 tests), `npm run build` đạt.
- Thêm kiểm thử cầu hai chiều, nước chặn đường ngoài cầu, và các tuyến liên tiếp từ nhà đến giếng, bàn mộc, vườn thuốc, trường học, bến sông và cổng.
- Chrome headless, dữ liệu thử riêng và cloud tắt: nhân vật đi thực tế qua 10 nhiệm vụ mở đầu đến nhập môn; kéo chạm với bảng nhiệm vụ mở; chạm sprite thu hoạch; cây che mờ và trở lại bình thường; cả hai nhân vật khởi đầu tại làng.
- Kiểm tra khung desktop, mobile ngang, iPhone xoay ngang qua CSS; Canvas và WebGL (SwiftShader), gồm màn hình mật độ 2. Đây là kiểm tra trình duyệt giả lập, chưa phải đo hiệu năng trên điện thoại thật.
- Script kiểm tra nằm tại `.preview/village-25d-qa.mjs`; thêm `--webgl` để chạy lượt kiểm tra dựng hình WebGL. Dùng server preview cô lập tại cổng 5177.

## Hình ảnh

Tạo bằng công cụ imagegen tích hợp, lưu PNG có alpha cho kiến trúc và cây/đạo cụ. [Danh sách đường dẫn và prompt đầy đủ](village-25d-assets.json).

- [Ảnh PC](previews/village-25d-pc.png)
- [Ảnh mobile](previews/village-25d-mobile.png)

Tải lại game rồi về Vương Gia Thôn để xem bản thử. Nhân vật mới vẫn bắt đầu tại đây.
