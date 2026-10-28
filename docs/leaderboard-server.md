# BXH toàn server

## Kích hoạt

Chạy toàn bộ [`supabase/leaderboard.sql`](../supabase/leaderboard.sql) trong **Supabase Dashboard → SQL Editor** bằng tài khoản quản trị database. File chạy trong một transaction, yêu cầu đã có `schema.sql` và `single-session.sql`; không cần tắt RLS hoặc cấp quyền đọc save của người khác. Có thể chạy lại file để cập nhật cấu hình và xây lại dữ liệu BXH.

Migration tạo cache riêng, tính lại chỉ số và đưa các nhân vật đã có save lên BXH, kể cả offline. Trigger cập nhật cache ngay khi save được ghi hoặc xóa; xóa Auth account cũng xóa hồ sơ BXH. Nếu đã có hệ thống Tiên Ngọc, việc cấp/thu hồi quyền sở hữu Tiên Pháp Bảo cũng cập nhật chỉ số của nhân vật offline. Nếu cài `combat-expansion.sql` sau migration này, chạy lại `leaderboard.sql` để gắn trigger vào bảng entitlement mới.

Workspace hiện chỉ có cấu hình public của game; chưa có kết nối quản trị DB để cài migration lên môi trường live. Client xử lý server chưa cài bằng thông báo **đang chờ kích hoạt**, có nút thử lại và hồ sơ cá nhân từ thiết bị. Không thay bằng người chơi mẫu.

Sau khi cài SQL và đưa bản client mới lên, mở **Thêm → Bảng Xếp Hạng** với hai tài khoản. Đăng xuất một tài khoản rồi tìm nhân vật đó từ tài khoản còn lại; nhân vật offline vẫn xuất hiện. Thay đổi trang bị hoặc tiến trình, bấm làm mới để lưu và xem hạng cập nhật.

## Quy tắc xếp hạng

| Bảng | Điểm |
| --- | --- |
| Lực Chiến | Công thức game: HP, MP, công, thủ, bạo kích; tính lại từ cấp, trang bị, cường hóa, linh thú và pháp bảo |
| Cấp Độ | Cấp đã lưu, tối đa theo dữ liệu game |
| Cảnh Giới | Đại cảnh giới rồi cấp/giai đoạn; phàm nhân được điểm 0 |
| Tông Môn | Cống hiến cá nhân, không phải tổng điểm tông môn |
| Phó Bản | Tổng số lần vượt các phó bản có trong danh mục game |
| Săn Boss | Bộ đếm `player.achievements.bossKills`, ghi khi có đóng góp hợp lệ |
| Linh Thú | Tổng bậc của linh thú đã thu phục + 3 điểm cho mỗi lần tiến hóa |

Điểm bằng nhau: cấp cao hơn đứng trước, sau đó UUID để vị trí ổn định giữa các lần tải. Bảng thành tích có điểm 0 chưa ghi danh; hồ sơ Của tôi vẫn xem được. Ngũ Hành trả về trạng thái chưa mở vì chưa có số liệu thật.

Boss chỉ bắt đầu được đếm ở phiên bản này. Save cũ bắt đầu từ 0; không suy ra lịch sử boss từ số lần vượt ải. Boss thường/solo ghi ở đường nhận thưởng có đóng góp. Phó bản tổ đội ghi một lần khi nhận kết quả thắng và đủ điều kiện nhận thưởng; dùng biên nhận tổ đội hiện có để tránh cộng lặp.

## API và dữ liệu công khai

`game_leaderboard(p_instance_id, p_category, p_query, p_offset, p_limit)` yêu cầu đăng nhập và phiên chơi còn hiệu lực. Khách anonymous đã đăng nhập Supabase vẫn dùng role authenticated. Role anon chưa đăng nhập không được gọi RPC.

Server trả top 3, một trang danh sách, tổng số kết quả, thời gian server và hồ sơ/hạng của người gọi. Tìm kiếm tên tiếng Việt không dấu được áp dụng sau khi xếp hạng nên không đánh lại số thứ tự. Trang tối đa 20 người, client dùng 8; offset được giới hạn 100.000, vẫn tìm được người ở hạng xa hơn bằng tên. Client hủy yêu cầu khi đổi tab/tìm kiếm/đóng màn hình và bỏ kết quả của phiên tài khoản cũ. Hết 12 giây hiển thị lỗi có thể thử lại.

Cache nằm trong schema `game_rank_private`, không public qua Data API và không cho anon/authenticated đọc hoặc sửa trực tiếp. Chỉ xuất tên nhân vật, UUID công khai, cấp/cảnh giới, tông môn, thuộc tính, trang bị đang mặc, kỹ năng, linh thú và một số tổng thành tích. Không xuất email, username đăng nhập, mật khẩu, token, túi đồ, tiền hoặc JSON save gốc. Tài khoản có `auth.users.banned_until` còn hạn hoặc nằm trong `game_account_blocks` bị ẩn ngay khi truy vấn, không cần đăng nhập lại để cập nhật cache.

RPC dùng SECURITY DEFINER với search path cố định, danh sách loại bảng cho phép và tham số truy vấn ràng buộc. Cách bảo vệ hàm tham khảo [Supabase Database Functions](https://supabase.com/docs/guides/database/functions); cách giữ hạng toàn cục khi tìm kiếm dùng [PostgreSQL window functions](https://www.postgresql.org/docs/current/tutorial-window.html).

Giới hạn hiện có: save vẫn do client gửi. Server tính lại lực chiến từ dữ liệu đã giới hạn và chỉ công nhận Tiên Pháp Bảo có entitlement, nhưng điều đó chưa chứng minh mọi cấp độ, đồ thường hoặc lịch sử chiến đấu đều hợp lệ. Chưa cấp thưởng theo BXH. Khi thêm giải thưởng cạnh tranh cần kiểm chứng tiến trình/biên nhận chiến đấu trên server trước.

## Bảo trì và kiểm tra

Sau khi đổi dữ liệu cân bằng, chạy:

```sh
npm run leaderboard:generate
npm run leaderboard:verify
```

Sau đó cài lại file SQL đã sinh. Generator lấy dữ liệu từ game: thuộc tính 120 cấp, danh mục 8 hệ, kỹ năng, mặc định bộ chiêu, trang bị/cường hóa, linh thú, cấp bậc tông môn và phó bản. Công thức cộng thuộc tính và lực chiến trong template phải được cập nhật nếu logic `playerStats`/`battlePower` thay đổi; kiểm tra SQL so sánh với các hàm thật để phát hiện sai lệch.

`leaderboard:verify` chạy PostgreSQL bằng PGlite trong bộ nhớ, không dùng khóa hay dữ liệu live. Bộ kiểm tra so sánh 64 cấu hình nhân vật với công thức thật, xác minh backfill offline, phân trang, tìm tên không dấu, thứ hạng toàn cục, save qua RPC hiện có, tài khoản bị khóa/xóa, entitlement offline, quyền truy cập và migration chạy lại.

SQL nguồn: [`scripts/sql/leaderboard.template.sql`](../scripts/sql/leaderboard.template.sql). File triển khai đã sinh: [`supabase/leaderboard.sql`](../supabase/leaderboard.sql). Không sửa riêng danh mục JSON lớn trong file đã sinh.
