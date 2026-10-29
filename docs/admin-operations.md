# Các lệnh điều hành admin

Mở `/admin/` → **Điều hành server**, hoặc nút **Quản lý** ở một tài khoản. Các lệnh có lý do, bước xem lại đối tượng/nội dung và mã yêu cầu để thử lại. Xóa Auth và thao tác toàn server yêu cầu nhập chính xác chuỗi xác nhận trong hộp xem lại.

## Thao tác đã nối

| Lệnh | Kết quả |
| --- | --- |
| Tạo tài khoản Auth | Tạo user bằng Auth Admin API. Mật khẩu từ 8 ký tự; xác nhận email bằng admin. Không cấp quyền admin cho tài khoản mới. |
| Khóa / mở khóa Auth | Khóa đăng nhập bằng Auth API; bảng chặn game ngắt cả phiên đang dùng token cũ. Mở khóa chỉ bỏ chặn sau khi Auth xác nhận. |
| Xóa Auth | Xóa cứng qua Auth API, dữ liệu game phụ thuộc được xóa theo FK. Giữ nhật ký và biên nhận tài chính; không xóa/khóa chính admin hoặc tài khoản thuộc `game_admins`. |
| Gửi vật phẩm / xóa vật phẩm | Cấp qua một thư riêng; người chơi tự mở Thư và nhận, không đổi túi hay ngắt phiên khi gửi. Mỗi lệnh tối đa 100.000 vật phẩm thường hoặc 100 trang bị. Khi nhận, trang bị có ID riêng; Linh Khí cộng vào trường nhân vật. Xóa vật phẩm vẫn thực hiện trực tiếp: tháo món đang mặc và xóa cường hóa của chính món đó. |
| Tiên pháp bảo | Entitlement chỉ được cấp khi người chơi nhận thư. Thu hồi vật phẩm sẽ thu hồi entitlement; mỗi lần một món. |
| Sửa save | Tải JSON và fingerprint hiện tại, xem lại JSON trước khi ghi; dữ liệu thay đổi sau khi tải sẽ báo `SAVE_CONFLICT`. Kiểm tra các trường chính, cấp/cảnh giới, tên, map, túi và trang bị. Không đổi tên hoặc biên nhận thư qua cách này. |
| Bảo trì | Thông báo chạy ở nửa trên màn hình trước 5 phút; trong thời gian báo trước vẫn chơi và lưu bình thường. Đến hạn, chặn mọi phiên game, kể cả admin và đăng nhập lại/F5. Dashboard `/admin` vẫn hoạt động để quản lý và mở lại server. Hủy bảo trì sẽ bỏ thông báo và mở lại truy cập. |
| Reset boss | Chọn boss từ catalog map công khai trên server; boss hồi sinh tại điểm gốc, đầy máu, làm mới AI/trạng thái, không phát thưởng. Client đang mở map kiểm tra lệnh mỗi 2 giây; peer chủ map áp dụng và đồng bộ cho người khác. |
| Reset phó bản | Chọn một tài khoản hoặc toàn server, một phó bản hoặc tất cả. Trả lượt đã dùng; giữ `clears` và thưởng lần đầu. Phiên chơi bị tác động dừng để tải lại dữ liệu, không tiếp tục dùng bộ đếm cũ. Đây không phải xóa thành tích hoặc đặt lại quyền nhận thưởng lần đầu. |

Sửa save/xóa đồ/reset lượt tăng `saves.admin_revision` và `player.adminRevision`, đồng thời thu hồi phiên chơi bị tác động. Gửi quà giữ nguyên save và phiên chơi; nhận quà tăng `mail_reward_revision` và `player.mailRevision`. Save trình duyệt cũ không thể ghi đè vật phẩm đã nhận hoặc thay đổi từ admin.

## Cài đặt

1. Server cần các migration trước: `schema.sql`, `combat-expansion.sql`, `single-session.sql`, `character-names.sql`, `admin-dashboard.sql`, `alphatest-mail.sql`.
2. Chạy **`supabase/admin-operations.sql`**, sau đó **`supabase/admin-catalog.sql`**, **`supabase/admin-delivery.sql`** và **`supabase/player-access.sql`** trong SQL Editor. Server đã có luồng quà admin qua thư chỉ cần chạy `player-access.sql` để cập nhật bảo trì và tên mới. Migration không tự chạy lệnh xóa/khóa/bảo trì/reset nào. Xem [chi tiết bản cập nhật](player-access-v2.md).
3. Deploy Edge Function **`admin-auth`** từ `supabase/functions/admin-auth/`. Có thể dùng Supabase Dashboard hoặc CLI:

   ```powershell
   supabase functions deploy admin-auth --project-ref YOUR_PROJECT_REF --no-verify-jwt
   ```

   `supabase/config.toml` đã khai báo tương ứng. Function tự kiểm tra bearer token bằng `auth.getUser()` và gọi `is_game_admin` bằng chính token người gọi trước mọi thao tác đặc quyền. Không chỉ decode JWT hay tin `user_metadata` để cấp quyền.
4. Edge runtime dùng `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ở phía server. Supabase hosted cung cấp các biến tiêu chuẩn này. Không đặt service-role key trong biến `VITE_*`, source frontend hoặc trình duyệt.
5. Deploy bản frontend mới. Khi thay định nghĩa vật phẩm/map/phó bản, chạy `node scripts/generate-admin-catalog.mjs` và áp dụng lại file catalog sinh ra. Catalog là whitelist server, thay thế danh mục cũ trong một transaction.

Chưa chạy migration hoặc chưa deploy function thì giao diện hiển thị lỗi thật; không mô phỏng thành công. Code và kiểm tra local không đồng nghĩa các lệnh đã được cài lên Supabase production.

## Thử lại, sao lưu và lỗi

SQL thay đổi game và biên nhận chạy cùng transaction. Lỗi kiểm tra hoặc lỗi ghi bất kỳ phần nào sẽ rollback cả thao tác. Gửi lại cùng mã với cùng nội dung trả kết quả cũ; gửi lại cùng mã với nội dung khác bị từ chối.

Auth và PostgreSQL là hai dịch vụ, không có transaction chung. `admin_prepare_auth` lưu công việc `pending` và chặn game trước các lệnh khóa/xóa. Edge Function thực hiện Auth, sau đó `admin_finish_auth` xác nhận bằng service role. Mật khẩu không nằm trong payload lưu hoặc audit.

Khi mất phản hồi, dùng **Thử lại cùng yêu cầu**. Nếu đã rời trang, mục **Yêu cầu Auth của bạn chưa xác nhận hoàn tất** cho mở lại công việc bằng đúng mã. Tạo Auth dùng ID xác định và marker trong `app_metadata`, nên thử lại không tạo thêm user hoặc đổi mật khẩu user đã tạo. Xóa đã thành công nhưng mất phản hồi được xác nhận lại khi user không còn tồn tại. Một công việc Auth đang chờ giữ khóa nghiệp vụ trên đối tượng; hoàn tất/thử lại công việc đó trước khi gửi thao tác Auth khác lên cùng tài khoản.

Nếu Auth API từ chối vì điều kiện ngoài game (ví dụ đối tượng Storage còn ràng buộc), thao tác không báo thành công; công việc vẫn chờ để xử lý nguyên nhân và thử lại. Không tự gọi trực tiếp SQL để tạo/xóa `auth.users`.

Mỗi thay đổi save lưu before-image trong `admin_save_backups`. Tải thông tin → **Sửa save** hiển thị tối đa 5 bản sao gần nhất để tải JSON. Khôi phục bằng cách xem lại/sửa JSON với fingerprint mới; vẫn phải giữ tên và revision thư hiện tại. Trình sửa JSON là công cụ nâng cao: có kiểm tra trường chính, nhưng không thể chứng minh mọi cấu trúc tiến trình tùy biến đều hợp lệ; nên giữ bản sao trước khi sửa lớn.

## Kiểm tra

- PostgreSQL trong PGlite độc lập: **39 kiểm tra đạt**, chạy bằng `node scripts/verify-admin-operations-sql.mjs <đường-dẫn-tới-pglite/dist/index.js>`; không kết nối tài khoản production. Kiểm tra quyền, chống lặp, xung đột save, trang bị, entitlement, bảo trì, bảo vệ admin, công việc Auth, FK khi xóa và backup. Hai script SQL cũ (Alphatest và dashboard) cũng qua 27 và 25 kiểm tra tương ứng.
- Tests: `src/admin/authHandler.test.ts`, `AdminOperations.test.tsx`, `src/net/serverControl.test.ts`, `merge.test.ts` và các test hồi quy hiện có.
- Edge handler được kiểm tra với adapter Auth giả, còn adapter SDK được kiểm tra TypeScript với package Supabase đang cài. Không có lời gọi tạo/xóa/khóa Auth thật trong quá trình kiểm tra.
- Toàn bộ **437 tests / 77 tệp** qua trong lượt kiểm tra hồi quy. Một thông báo JSDOM không hỗ trợ chuyển trang vẫn xuất hiện ở test AuthScreen và không làm test thất bại.
- QA Chrome/Canvas riêng sử dụng backend giả, không dùng save/tài khoản thật: xem lại/cấp vật phẩm, khóa nút xóa đến khi nhập đúng ID, khung mobile 390×844, reset Cửu Vĩ Thiên Hồ đang có 10 HP về đầy máu trong map thật và hiển thị thông báo bảo trì khi game đang chạy. Dashboard vẫn hoạt động khi game bị ngắt; không có exception chưa xử lý. Đây không phải phép đo trên máy điện thoại thật hay thử Auth production.

Tài liệu API chính thức đã đối chiếu: [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid), [xác thực Edge Function](https://supabase.com/docs/guides/functions/auth-legacy-jwt).
