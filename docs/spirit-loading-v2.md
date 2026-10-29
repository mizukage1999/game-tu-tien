# Chiến đấu, Thế Giới, loading và Linh Thú

- Tán tu dùng HP, công và thủ bằng 1,5 lần thông số cũ ở cùng cấp/cảnh giới sinh ra. EXP và bảng rơi giữ nguyên. Không tự tăng sức mạnh theo người chơi đứng gần.
- Khi đánh lên cảnh giới cao hơn: lệch 1 đại cảnh giới gây 75% sát thương; lệch 2 gây 50%; lệch từ 3 trở lên gây 25%. Ngang hoặc đánh xuống cảnh giới không bị giảm thêm. Đây là hệ số sau phòng thủ, áp dụng cả bạo kích; sát thương tối thiểu 1. Vấn Đỉnh → Dương Thực đúng 50%. Quy tắc dùng cho đánh thường/kỹ năng vào quái, tán tu, đòn quái/boss vào người chơi, linh thú và PK ngoài bản đồ. Tỷ võ dùng luật sân đấu hiện có.
- Map online tính hệ số tại peer đang điều hành map, rồi đồng bộ kết quả; đòn linh thú không bị nhân giảm hai lần.
- Thế Giới là chat công khai cho mọi tài khoản online trên cùng kênh server, không giới hạn map. Có tab gửi riêng trong cửa sổ chat và lối mở từ thanh chat. Gần và Chat mật giữ riêng luồng. Tin dài tối đa 200 ký tự; gửi cách nhau 2 giây. Kết nối chưa sẵn sàng thì giữ nội dung để thử lại. Tin được khử trùng ID; bộ nhớ chat giới hạn 300 tin cho phiên hiện tại.
- PC bỏ vòng điều hướng WASD trên HUD; thao tác di chuyển bằng chuột vẫn giữ. Mobile giữ điều khiển chạm.
- Loading vào game và chuyển map dùng nền mới, 5 huy hiệu theo vùng, thanh tiến độ từ loader thực và tên đích. Chuyển map đã cache cũng kích hoạt loading trong quá trình chuyển cảnh; không thêm thời gian chờ giả. Giữ phát hiện tải lỗi và thử lại bằng cấu hình nhẹ; tôn trọng reduced motion.
- Linh Thú có icon riêng trên top menu: PC đủ 16 mục trong hai hàng, mobile ở Thêm. Giao diện chỉ gồm danh sách, thông tin, nuôi dưỡng, tiến hóa và kỹ năng; không có sidebar tính năng khác hoặc trang bị linh thú. Lối cũ từ Tiên Lộ cũng mở panel gọn này. Tên loài, bậc/thân mật, nguyên liệu, dấu ấn và kỹ năng dùng dữ liệu thật của 6 loài hiện có, không tạo số cấp giả hoặc mở khóa linh thú miễn phí.

Ba asset được tạo bằng skill imagegen và công cụ tích hợp, sau đó lưu trong `public/assets/ui/`: `loading-landscape-v2.png`, `loading-crests-v2.png`, `spirit-beasts-v2.png`. Bản WebP trong `public/assets/optimized/` giữ nguyên tọa độ atlas 3×2 và alpha, được kiểm tra bằng bộ encode/verify hiện có. Không cần migration SQL cho bản này.

Prompt và nguồn ảnh: [spirit-loading-v2-assets.json](spirit-loading-v2-assets.json).

## Xác minh

- 483 kiểm thử trong 88 file qua; gồm sát thương Vấn Đỉnh → Dương Thực, hệ số bạo kích, thông số tán tu, authority và snapshot online, broadcast Thế Giới qua map, tách tin riêng, nuôi dưỡng/tiến hóa/thu phục và menu.
- Build production và ESLint qua. Bộ xác minh runtime kiểm tra 63 ảnh delivery, hash nguồn, kích thước atlas và alpha; ba ảnh mới giảm từ khoảng 8,5 MB PNG xuống 2,3 MB WebP, không đổi tọa độ cắt.
- QA Chrome/Canvas riêng: PC 1440×900, mobile 844×390 và 640×360; cả năm tab Linh Thú vừa khung, không tràn ngang, không có sidebar tính năng khác/Trang Bị. Đã bấm nuôi dưỡng và tiến hóa để xác nhận vật phẩm bị trừ và bậc/tiến hóa thật tăng. Atlas được clip từng ô để ảnh ở khung rộng không lộ loài bên cạnh.
- Đã quan sát loading khởi động, tên map đích khi chuyển cảnh và loading khi dựng lại map đã cache. Tiến độ dùng sự kiện game, không thêm thời gian chờ tối thiểu.
- Hai tài khoản QA ở Vương Gia Thôn và Ngoại Môn gửi/nhận tin Thế Giới hai chiều bằng giao diện thật, tin hiện trong log và khung chat, không lặp tin của chính mình. Không có exception chưa xử lý hay asset tải lỗi. Đây là môi trường QA giả lập backend và màn hình, chưa thử trên điện thoại thật hoặc server production.
