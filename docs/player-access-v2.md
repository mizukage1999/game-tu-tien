# Tên nhân vật, menu PC và bảo trì

## Hành vi

- Khi tạo nhân vật mới, ô tên để trống. Người chơi tự nhập 6–16 ký tự, sau khi chuẩn hóa Unicode NFC và khoảng trắng. Đổi hệ vẫn giữ tên đang nhập. Tên không được trùng giữa các tài khoản, không phân biệt chữ hoa/thường. Giao diện và server cùng kiểm tra. Tên ngắn đã có trong save được giữ nguyên.
- PC hiện toàn bộ 15 mục menu thành 2 hàng, Cài Đặt cuối cùng, không cần mở Thêm. Mobile giữ menu gọn và nút Thêm.
- Bật bảo trì đặt thời hạn 5 phút theo giờ server. Trong thời gian báo trước vẫn chơi/lưu bình thường và có dòng thông báo đếm ngược. Đến hạn, cả admin và người chơi đều bị dừng phiên game; F5 không tạo lại được phiên, không tải save vào game và không tiếp tục ghi save. `/admin` vẫn sử dụng phiên Auth để quản lý và mở lại server.
- Client đã nhận hạn bảo trì sẽ kiểm tra hạn riêng mỗi giây, kể cả khi lần gọi mạng tiếp theo bị treo. Kết quả mạng cũ không thể mở lại phiên đã dừng; việc làm mới token Auth cũng không tự khởi động lại trang game đó. Sau khi mở lại server, tải lại trang để vào game.

## Áp dụng server hiện có

1. Server cần có các migration nền và `character-names.sql`, `admin-operations.sql`, `admin-catalog.sql`, `alphatest-mail.sql`, `admin-delivery.sql`.
2. Chạy toàn bộ [`supabase/player-access.sql`](../supabase/player-access.sql) trong Supabase SQL Editor, rồi triển khai frontend mới. File chạy trong transaction, không tự bật/tắt bảo trì, không sửa tên hoặc backfill save. Có thể chạy lại.
3. File nâng cấp đặt lại cả các RPC phiên chơi để khắc phục trường hợp migration `single-session.sql` cũ đã ghi đè kiểm tra bảo trì. Không chạy lại migration phiên cũ sau bản nâng cấp này.

Workspace chỉ có cấu hình public, không có kết nối quản trị database. Migration live và triển khai chưa được thực hiện trong phiên này.

SQL được sinh từ `admin-operations.sql` và `character-names.sql` bằng `npm run player-access:generate`. Khi sửa hàm điều hành, sinh lại cả `node scripts/generate-admin-delivery-sql.mjs` để các đường cài mới/nâng cấp đồng nhất.

## Xác minh

- `npm run player-access:verify`: 22 kiểm tra PostgreSQL cục bộ, gồm tên ngắn/trùng/Unicode, chống bỏ qua kiểm tra qua RPC save, tên cũ, hạn 5 phút, chặn admin/người chơi sau hạn, F5, dashboard và mở lại server, chạy migration lại.
- `node scripts/verify-admin-operations-sql.mjs`: 50 kiểm tra điều hành, gồm luồng thư và bảo trì. Dùng PostgreSQL PGlite riêng, không dùng dữ liệu production.
- Unit test bao phủ ô tên trống, giữ tên khi đổi hệ, lỗi tên, menu PC/mobile, hạn bảo trì khi RPC treo và ngăn token refresh tự nối lại phiên đã dừng.
- 475 kiểm thử trong 85 file đã qua. Kiểm tra lại riêng phiên đăng nhập và menu sau điều chỉnh cuối: 4 kiểm thử qua.
- Build production, kiểm tra asset runtime và ESLint đều qua.
- QA Chrome/Canvas dùng backend giả: PC 1440×900, 1280×720, 1024×768 và 800×600 hiển thị đủ 15 mục trong đúng 2 hàng, không đè avatar/minimap, bấm Túi Đồ mở đúng tính năng. Mobile 844×390 và 640×360 giữ 5 nút chính và menu Thêm, Cài Đặt cuối cùng. Tạo tên riêng, đổi hệ, lưu tên và ngắt admin theo hạn đã nhận đều qua, không có lỗi trình duyệt chưa xử lý hoặc asset tải thất bại. Phép thử trình duyệt dùng hạn rút ngắn để kiểm tra chuyển trạng thái; hạn 5 phút thật được xác minh trong PostgreSQL và unit test. Chưa thử trên điện thoại thật.
