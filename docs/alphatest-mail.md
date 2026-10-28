# Thư Alphatest

Đăng nhập online trong thời gian mở Alphatest sẽ nhận một thư `alphatest-v1`. Người chơi đọc được ngay; nút nhận chỉ mở sau khi hoàn thành nhập môn (`player.admitted = true`). Mỗi tài khoản nhận một gói, không có gói nhập môn thứ hai.

Quà được cộng khi bấm **Nhận quà Alphatest**:

- Đưa nhân vật dưới cấp 99 lên cấp 99, cảnh giới tương ứng Khuy Niết, EXP còn lại bằng 0. Server ghi lượng EXP đã dùng trong biên nhận; không cộng thêm EXP làm vượt cấp 99. Nhân vật từ cấp 99 trở lên giữ cấp, cảnh giới và EXP.
- Cộng **99.999 Tiên Ngọc** vào ví server.
- Cộng **99.999 Linh Thạch** vào túi đồ.
- Cộng **999.999 Linh Khí** vào nhân vật.

## Cài server

Chạy `supabase/alphatest-mail.sql` trong Supabase SQL Editor sau `schema.sql`, `combat-expansion.sql` và `single-session.sql`. Dashboard đã dùng `admin-dashboard.sql` thì tab **Alphatest** hiển thị trạng thái phát thư, tổng thư đã gửi/đã nhận và nút mở/dừng phát thư mới. Chỉ tài khoản trong `game_admins` được sửa trạng thái. Ghi nhận thao tác quản trị nếu bảng audit đã được cài.

Migration mặc định mở phát thư lần đầu. Chạy lại không mở lại chiến dịch đã tắt và không gửi trùng. Dừng chiến dịch chỉ ngăn thư mới; thư đã gửi vẫn giữ quyền nhận. Không tự xóa thư chưa nhận. Tạo lại nhân vật không tạo lại quyền nhận quà của tài khoản.

Thư, snapshot, ví Tiên Ngọc, lịch sử ví và biên nhận được xử lý bằng RPC có xác thực. Phiên đăng nhập cũ không nhận được quà. Một lỗi giữa chừng sẽ rollback cả gói. Không có Tiên Ngọc giả ở chế độ offline.

## Đồng bộ

Client chờ hàng đợi lưu hoàn tất trước khi claim; cảnh game tạm dừng trong lúc nhận và tiếp tục khi hoàn tất hoặc lỗi. Mỗi yêu cầu có giới hạn chờ 20 giây. Mất phản hồi có thể thử lại: server trả biên nhận cũ, không cộng lần nữa. Client tải biên nhận còn thiếu trước khi lưu tiếp.

`saves.mail_reward_revision` và `player.mailRevision` ngăn autosave cũ ghi đè phần thưởng. Khi revision cloud và cache khác nhau, cloud được ưu tiên kể cả đồng hồ máy chạy nhanh. Các RPC lưu cũ vẫn dùng được nếu mang đúng revision hiện tại. Client cũ cần tải lại bản mới sau khi nhận thưởng.

## Kiểm tra

`npm test -- src/net/gameMail.test.tsx src/net/cloudSave.test.ts src/net/merge.test.ts src/net/premium.test.ts --maxWorkers=2 --minWorkers=1`

Kiểm tra PostgreSQL độc lập, không kết nối dữ liệu thật:

`node scripts/verify-alphatest-mail-sql.mjs <đường-dẫn-tới-@electric-sql/pglite/dist/index.js>`

PGlite là công cụ kiểm tra tùy chọn, không thêm vào dependency chạy game. Script kiểm tra quyền truy cập, điều kiện nhập môn, nhận lặp, dữ liệu cấp cao, rollback nguyên gói, autosave chậm, phục hồi phản hồi bị mất và quản trị chiến dịch.
