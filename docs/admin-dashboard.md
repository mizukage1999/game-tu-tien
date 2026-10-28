# Admin Dashboard

Mở **/admin/** hoặc **/admin/index.html** trên cùng địa chỉ với game. Trong game, tài khoản admin cũng có liên kết tại **Tiên Ngọc → Quản trị → Mở Admin Dashboard**.

Trang dùng cùng đăng nhập và bảng quyền game_admins hiện có, nhưng không khởi động Phaser, không nhận phiên chơi và không ghi save nhân vật.

## Cài trên server

1. Game online cần có schema.sql và combat-expansion.sql. Nếu ví Tiên Ngọc đã hoạt động, các phần này thường đã được cài.
2. Trong Supabase SQL Editor, chạy toàn bộ [supabase/admin-dashboard.sql](../supabase/admin-dashboard.sql). Script tạo các RPC quản trị, bảng kế hoạch sự kiện và nhật ký, không sửa tiến trình người chơi.
3. Nếu chưa có admin, đăng ký tài khoản theo luồng game trước, rồi chủ server gán đúng username:

```sql
insert into public.game_admins(user_id)
select id from public.profiles
where username_key=lower('USERNAME_ADMIN_CUA_BAN')
on conflict do nothing;
```

Thay chuỗi placeholder bằng username đã đăng ký; không tạo admin từ metadata do trình duyệt gửi lên. Tài khoản đã có trong game_admins không cần gán lại.

4. Chạy npm run build và đưa dist lên hosting hiện tại như các bản game khác. Có sẵn dist/admin/index.html nên trang quản trị có HTML riêng. Không cần đưa service-role key vào trình duyệt.

SQL mới **chưa được áp dụng lên Supabase thật trong phiên làm việc này** vì không có kết nối quản trị database. Đã kiểm tra bằng PostgreSQL PGlite riêng với dữ liệu thử nghiệm; không đọc hoặc cấp ngọc trên tài khoản thật.

## Phần đã hoạt động

- **Tổng quan:** tổng tài khoản, nhân vật, Tiên Ngọc đang lưu hành, log trong ngày theo giờ Việt Nam và số kế hoạch nháp. Danh mục vật phẩm lấy từ định nghĩa thật của bản phát hành.
- **Tài khoản:** tìm theo username/tên nhân vật/email/UUID, lọc hoạt động, phân trang 8/20/50 dòng, xem tiến trình/túi đồ/trang bị/nhiệm vụ trong bản lưu. Mỗi lần xem túi đồ/nhiệm vụ giới hạn 300 loại.
- **Hoạt động:** nhãn Vừa đồng bộ nghĩa là saves.updated_at nằm trong 90 giây gần nhất. Đây không phải presence online trực tiếp, IP hoặc lịch sử đăng nhập.
- **Vật phẩm/nhiệm vụ/boss:** tìm kiếm, lọc và xem cấu hình thật của bản phát hành, điểm sinh boss, chỉ số/loot. Các danh mục này chỉ đọc; không giả vờ thêm/xóa đồ hoặc reset boss đang chạy.
- **Tiên Ngọc:** chọn tài khoản, nhập số lượng/lý do, xem lại trước khi xác nhận. Dùng RPC admin_grant_tien_ngoc hiện có, giữ nguyên request UUID khi thử lại lỗi mạng để tránh cấp hai lần. Log có actor, người nhận, số ngọc và lý do thực tế.
- **Sự kiện:** tạo/sửa/lưu trữ kế hoạch trong database; version chống ghi đè khi hai admin sửa cùng lúc. Đây là bản nháp nội bộ, chưa phát thưởng hoặc kích hoạt sự kiện trong game.
- **Nhật ký:** kết hợp premium_ledger và admin_audit_logs, lọc/phân trang/xuất trang CSV. Chưa có kho log đăng nhập, chat, lỗi chiến đấu hay IP người chơi.
- **Xuất dữ liệu:** tài khoản/log xuất trang hiện tại; vật phẩm/nhiệm vụ xuất danh mục đã lọc. Chuỗi do người dùng nhập được xử lý để tránh trở thành công thức trong phần mềm bảng tính.
- **Cài đặt:** xem trạng thái kết nối, kiểm tra lại quyền và tự làm mới 30 giây khi tab đang hiển thị.

Chưa mở các lệnh tạo/xóa/khóa tài khoản Auth, cấp/xóa vật phẩm, sửa save, bảo trì toàn server hoặc reset boss/phó bản. Những thao tác đó cần luồng server và xử lý tranh chấp save riêng; dashboard hiện không có nút giả thực hiện chúng.

## Phân quyền và tải trang

Mọi RPC quản trị mới đều kiểm tra auth.uid() và is_game_admin() ở server. Bảng/view nội bộ không cấp quyền đọc trực tiếp cho anon/authenticated. Các hàm SECURITY DEFINER đặt search_path cố định và thu hồi quyền PUBLIC trong cùng transaction, theo [hướng dẫn PostgreSQL](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).

Đăng xuất hoặc đổi tài khoản loại bỏ nội dung đang xem; phản hồi phân quyền cũ không mở dashboard cho tài khoản mới. Hộp xem/xác nhận giữ focus, hỗ trợ Tab và Escape.

Game và admin là hai HTML entry dùng chung main. CommonJS helper được tách khỏi chunk Phaser; kiểm tra generateBundle sẽ làm build thất bại nếu admin lại phụ thuộc tĩnh vào Phaser. Không tải UI admin trong luồng vào game thường. Ảnh nền và icon tái sử dụng bộ game hiện có; không thêm bộ hình lớn vào bước tải đầu.

## Kiểm tra

- 17 tests / 4 files đạt: phân quyền trang admin, đăng xuất/đổi tài khoản, phản hồi đến muộn, xác nhận cấp ngọc, giữ mã khi thử lại, xung đột phiên bản kế hoạch, CSV và hồi quy ví/shop Tiên Ngọc.
- 25 kiểm tra SQL đạt trên PGlite: chặn non-admin/anon, chặn đọc trực tiếp bảng/view, số liệu/tìm kiếm/phân trang thật, dữ liệu save lỗi, cấp ngọc cùng mã đúng một lần, nhật ký, lưu/lưu trữ kế hoạch và chống ghi đè.
- Chrome QA riêng: tìm/phân trang tài khoản, focus/Escape, mất phản hồi sau cấp ngọc rồi thử lại, tạo bản nháp, các danh mục thật, log và chặn tài khoản thường; không có lỗi JavaScript chưa xử lý.
- Kiểm tra khung 1536 × 1100 desktop; 390 × 844, 667 × 375, 1024 × 768. Mobile dùng trang tự nhiên, không ép xoay theo màn game. Bảng rộng cuộn ngang trong vùng riêng.
- Production HTML được phục vụ từ dist/admin/index.html: đúng tiêu đề, không tải chunk Phaser/game App, không hiển thị nội dung riêng khi chưa đăng nhập.
- Hồi quy vào game: nhân vật mới vẫn vào Vương Gia Thôn, game store khởi tạo sau boot tài khoản, không tải UI admin.
- TypeScript/Vite production build, kiểm tra runtime asset, kiểm tra tách engine và ESLint các file thay đổi đều đạt.

SQL có thể kiểm tra lại bằng [script kiểm tra](../scripts/verify-admin-dashboard-sql.mjs). [PGlite](https://pglite.dev/docs/api) được cài riêng trong thư mục QA, không thêm dependency production:

```powershell
npm.cmd install --prefix .preview/admin-db-test --no-save --package-lock=false @electric-sql/pglite
node scripts/verify-admin-dashboard-sql.mjs
```

## Ảnh kiểm tra

Ảnh dùng dữ liệu backend QA, không phải tài khoản/số dư thật:

- [Tổng quan desktop](previews/admin-dashboard-desktop-overview.png)
- [Xác nhận cấp Tiên Ngọc](previews/admin-dashboard-desktop-jade-review.png)
- [Kế hoạch sự kiện](previews/admin-dashboard-desktop-events.png)
- [Mobile](previews/admin-dashboard-mobile-overview.png)
- [Từ chối tài khoản thường](previews/admin-dashboard-access-denied.png)
