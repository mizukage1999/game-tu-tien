# Ổn định lúc vào game trên mobile

Thiết bị người chơi báo lỗi: **Redmi Note 11, Chrome**. Chưa có log từ chính máy bị lỗi, vì vậy chưa kết luận mọi trường hợp văng đều cùng nguyên nhân. Đã xác định và sửa các điểm cấp phát bộ nhớ lớn trong luồng khởi tạo.

## Các thay đổi

- Đăng ký artwork không đổi bằng Texture thường, tránh `CanvasTexture` tự đọc và giữ thêm một bản RGBA đầy đủ. Ảnh, alpha, frame và hướng nhân vật giữ nguyên.
- Nền map chia thành trang 1024 px, có viền lấy mẫu để không hở đường ghép khi camera zoom. Không upload nguyên nền hơn 3500–4000 px lên GPU. Bản canvas nền tạm được giải phóng ngay; các trang cũ được bỏ trước khi dựng map mới.
- Chỉ dựng sprite phái/độ tuổi của người chơi ban đầu. Sprite người khác được dựng khi presence thật xuất hiện, vẫn đủ 8 hướng và cả 8 phái.
- Chỉ tải/dựng loài quái cần ở map đó. Phó bản tính cả boss và mọi đợt quái của tất cả độ khó dùng chung map.
- Bỏ các atlas nguồn đã tách thành sprite nhỏ hoặc URL icon. Không giữ thêm bản GPU của các sheet NPC, icon và actor nguồn không dùng để vẽ.
- Tắt pool pre-FX không sử dụng. Trên mobile tắt đăng ký post-FX không cần thiết; kỹ năng vẫn dùng sprite/effect hiện có.
- Giới hạn tải ảnh đồng thời trên mobile và dùng đường tải ảnh trực tiếp.
- Với mobile báo bộ nhớ ≤4 GB: tối đa 2×; ≤2 GB: tối đa 1,5×. Máy khỏe vẫn giữ lựa chọn Sắc nét tới 3×. Giới hạn thêm theo khả năng framebuffer GPU. Không đổi độ phân giải liên tục theo FPS và không ghi đè cài đặt đồ họa của người chơi.
- Ghi dấu lần vào game chưa ổn định trong sessionStorage. Nếu lần tải trước bị ngắt trong vòng 5 phút, lần tiếp theo dùng ngân sách nhẹ hơn; lặp lại thì chọn Canvas. Sau 10 giây vào map ổn định, xóa dấu này. Đóng game bình thường cũng dọn dấu.
- Bắt lỗi chuẩn bị dữ liệu, tạo map và mất WebGL context. Loading lâu có thông báo và nút thử lại, thay cho chờ vô hạn. Nút **Thử lại với cấu hình nhẹ** lưu tiến độ nếu scene còn hợp lệ, tải lại vào Canvas và không bắt người chơi qua màn hình Bắt đầu lần nữa. Cấu hình dự phòng chỉ áp dụng cho phiên tab hiện tại.
- Scene tạo map thất bại không chạy tiếp vòng cập nhật trên dữ liệu chưa khởi tạo.

## Kết quả kiểm tra

Chrome headless dùng WebGL/SwiftShader, backend QA riêng. Có giả lập màn hình Retina 844×390, DPR 3; profile mobile `deviceMemory=4`, 8 luồng CPU. Đây là cấu hình API giả lập, không thay thế thử trực tiếp trên Redmi Note 11 hoặc ép giới hạn RAM thật của hệ điều hành.

- Vào Vương Gia Thôn, nhân vật nhập môn, đổi sang Rừng Linh Thú thành công.
- JS heap quan sát ngay sau khi vào làng giảm từ khoảng **144 MB trước sửa** xuống **37–38 MB sau sửa**; ở map có quái từ khoảng **205 MB** xuống **39–41 MB**. Đây là JS heap ở từng mẫu, không phải toàn bộ RAM, đỉnh RAM hay VRAM. Số đo có thể thay đổi theo GC, cache và tải của máy QA.
- Texture artwork không giữ bản `imageData` RGBA. Pool pre-FX có 0 render target. Trang nền lớn nhất 1026×1026 kể cả viền lấy mẫu.
- Profile 4 GB chọn framebuffer 1688×780 (2×) thay vì 2532×1170 (3×), chữ HUD DOM vẫn theo độ nét màn hình.
- Bơm presence đủ 8 phái, cả trẻ em/người lớn: đúng texture và animation đi lên cho toàn bộ 16 trường hợp.
- Chủ động làm mất WebGL context: hiện nút phục hồi và vào lại map bằng Canvas thành công, không có JavaScript exception chưa xử lý.
- Vào phó bản bằng nút Khai chiến và rời về map trước thành công; đúng một lượt bị trừ. Minimap và các thao tác chọn độ khó/phần thưởng vẫn hoạt động.
- 384 tests / 68 files đã xác minh. Lượt chạy đầy đủ có 5 nhóm timeout tải module do máy QA bận; chạy lại 5 nhóm với giới hạn worker, cả 114 test trong các nhóm đó đều qua. Các nhóm còn lại đã qua trong lượt đầu.
- TypeScript/Vite production build và ESLint cho các file thay đổi đạt.

Cần thử bản build mới trực tiếp trên Redmi Note 11 để xác nhận lỗi người chơi gặp đã hết. Không xóa dữ liệu nhân vật, nới quy tắc một tài khoản/một phiên, hoặc triển khai bản sửa lên server trong tác vụ này.
