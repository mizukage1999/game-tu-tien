# Chiến đấu, tăng sức mạnh và mục tiêu — 30/10/2026

## Chiến đấu

Kỹ năng bắt đầu hoạt ảnh và hiệu ứng ngay khi nhận thao tác hợp lệ. Sát thương
tiếp tục chờ đúng thời gian vận chiêu của từng kỹ năng; bỏ khoảng chờ hoạt ảnh
nhân vật bị cộng thêm trước thời gian vận chiêu. Luồng ngoài map và tỷ võ dùng
cùng thông số kỹ năng. Đánh thường vẫn đánh trúng ở khung hoạt ảnh tương ứng.

Một lần bấm gần nhất được giữ tối đa 180 ms khi chiêu sắp hồi hoặc hoạt ảnh đang
kết thúc. Không xếp hàng nhiều đòn. Lần bấm quá cũ bị bỏ; mở giao diện, mất focus,
bị khống chế, bế quan hoặc ngã xuống xóa thao tác chờ. Lướt xóa chiêu đang chờ.
Tỷ võ cũng hỗ trợ cửa sổ bấm sớm trước hồi chiêu và vẫn kiểm tra MP, bộ chiêu,
khống chế, số thứ tự gói tin và hồi chiêu trên engine.

## Cảm nhận tăng sức mạnh

Một bảng nhỏ hiện cấp/cảnh giới vừa đạt, lực chiến tăng bao nhiêu, công/phòng/
sinh lực tăng thật và chiêu mới mở. Trang bị, cường hóa, linh thú và nâng kỹ năng
được nhận biết từ thay đổi build nhân vật. Hồi HP/MP, nhặt nguyên liệu và EXP chưa
lên cấp không tạo thông báo tăng lực giả. Điểm lực chiến giữ nguyên công thức;
nâng riêng kỹ năng được báo bằng tên và cấp chiêu, không tự cộng điểm lực chiến.

Bảng không tự mở menu hay dừng trận đánh. Người chơi có thể đóng hoặc bấm xem
thuộc tính/bộ chiêu. Thông báo cấp/cảnh giới cũ được ẩn trong lúc bảng này hiện
để tránh hai thông báo chồng lên nhau. Ánh sáng tăng cấp trong map được giữ lại.

## Mục tiêu tiếp theo

Giai đoạn Vương Gia Thôn luôn có nút đi tiếp/trả nhiệm vụ. Hướng dẫn nhập môn
vẫn nhắc đánh thường, sử dụng chiêu, lướt, hồi phục và né boss theo tình huống.
Sau chương nhập môn, mục tiêu có nút thực hiện và thanh tiến độ:

- Chưa có đá cường hóa: tới phó bản để kiếm đá; đủ đá mới tới màn hình nâng đồ.
- Đạt bình cảnh: lần lượt kiểm tra số Phá Cảnh Đan tăng gấp đôi, Linh Khí,
  Linh Thạch và vị trí Linh Đài. Chỉ báo sẵn sàng khi đủ điều kiện thực tế.
- Đủ dấu chiến thắng hoặc đã có linh thú: thu phục/cho xuất chiến.
- Còn tăng cấp: chỉ vùng luyện và EXP cần cho cấp kế tiếp; cấp tối đa hướng tới
  phó bản và tổ đội. Nhiệm vụ chính đã xong được nhắc trả thưởng trước.

Các nút dùng luồng menu/di chuyển/nhiệm vụ đang có. Hướng dẫn không tự đi, nhận
thưởng, cấp đồ hay tiêu nguyên liệu.

## Độ nét và tải dựng hình

Canvas chính giữ ngân sách Retina theo DPR, cấu hình đã chọn, bộ nhớ và giới hạn
GPU hiện có; không đổi kích thước liên tục giữa trận. Icon kỹ năng cache 192 px
thay cho 96 px; minimap có bitmap theo DPR tối đa 3; chữ sát thương dựng ở độ
phân giải 2. Ảnh nguồn và alpha không bị sửa hoặc làm sắc bằng bộ lọc giả.

Thanh HP trên đầu chỉ dựng lại hình học khi tỷ lệ HP thay đổi, vẫn di chuyển
theo nhân vật mỗi khung. Trong kiểm tra 120 khung đứng yên: 0 lần dựng lại thay
vì vẽ lại mỗi khung như trước. Chữ, tia va chạm và chiêu ngoài camera không tạo
đối tượng đồ họa. Số hiệu ứng đuôi sau va chạm có ngân sách 18/12/8 theo cấu hình;
vận chiêu, thời điểm trúng và vùng sát thương kéo dài luôn được bảo vệ, nên các
đòn đồng thời có thể tạm vượt ngân sách. Tất cả vẫn xử lý sát thương bình thường.

Bộ điều tiết đo thời gian khung hình thực bằng đồng hồ trình duyệt; delta đã làm
mượt của engine không còn che mất việc dựng chậm. Tab ẩn/tải map không bị tính
nhầm thành máy yếu. Máy chậm giảm trang trí/đuôi hiệu ứng và bóng CSS của tỷ võ,
giữ độ nét khung hình và các dấu hiệu chiến đấu cần thiết.

## Xác minh và giới hạn

508 kiểm thử, lint và build thành công. Trình duyệt kiểm tra luồng nhập môn,
kiếm đá/nâng đồ, lên cấp mở chiêu, thao tác nối chiêu, xóa thao tác khi mở menu,
vẽ HP theo thay đổi và các buffer Retina. Tại viewport mobile 844×390, DPR 3:
canvas chính 2532×1170, minimap 396×396 và icon cache 192×192.

Hai tài khoản qua backend giả cục bộ nhìn thấy chiêu của nhau. Tỷ võ có hiệu ứng
thật và trở về map bình thường, không có lỗi trình duyệt hoặc ảnh tải thất bại.
Một lần chạm nút chỉ gửi một lệnh, bàn phím vẫn kích hoạt được nút; mất focus xóa
lệnh chưa gửi. Chiêu mẫu vận 400 ms không gây sát thương trước mốc đó và chỉ
đánh một lần đúng mốc 400 ms. Kiểm tra tải cao giữ được nhiều vận chiêu đồng thời,
chỉ cắt đuôi an toàn và không xóa vùng Hoàng Tuyền khi vẫn còn tác dụng.

Kiểm tra CPU chậm 4 lần dùng Chrome headless/SwiftShader chỉ xác nhận cơ chế
nhận biết tải nặng và giữ kích thước Retina; không dùng kết quả này để tuyên bố
60 FPS trên điện thoại thật. Chưa đo trên Redmi Note 11, iPhone hay GPU PC vật lý.
Mục tiêu là 60 FPS; tốc độ thực tế còn phụ thuộc phần cứng và nhiệt độ máy.
