# Tán tu, một phiên đăng nhập và HUD sáu chiêu

## Tán tu theo độ khó map

`wandererRealmWeights` lấy mức khuyến nghị của map làm tâm phân bố cảnh giới. Nếu map chưa có khoảng cấp, hàm lấy cấp trung bình của quái trong map. Các cảnh giới gần mức map có trọng số lớn hơn; mọi cảnh giới vẫn có một xác suất nhỏ để tạo tình huống gặp cao thủ hoặc người yếu hơn.

Cấp nội bộ được bốc tiếp trong cảnh giới đã chọn. Không còn giới hạn cấp 100; có thể gặp Tịnh Niết và Toái Niết. Chỉ số chiến đấu và nhãn cảnh giới cùng lấy cấp đã bốc. Tán tu vẫn chỉ xuất hiện ngoài dã ngoại có quái, không xuất hiện trong làng, thành, tông môn, động phủ hay phó bản. Seed roster vẫn thống nhất theo map để các peer có cùng tên, ngoại hình và sức mạnh khi chuyển quyền mô phỏng.

Kiểm tra 5.000 mẫu mỗi vùng xác nhận map 91–99 có phần lớn tán tu từ Dương Thực trở lên, cao hơn rõ rệt so với map 1–10; có mẫu trên cấp 110. Có kiểm tra seed thực của Thiên Kiếp Nhai, đủ 12 cảnh giới và giới hạn cấp 1–120.

## Một phiên chơi cho mỗi tài khoản

**Cần chạy [supabase/single-session.sql](../supabase/single-session.sql) trên Supabase SQL Editor sau `schema.sql`, trước khi dùng client mới.** Script có thể chạy lại, không xóa hồ sơ hay save. Workspace này không có kết nối quản trị database nên migration chưa được áp dụng lên Supabase production.

1. Mỗi trang mở tạo một instance UUID; server ghi chủ sở hữu hiện tại vào `game_sessions`. Claim mới thay phiên cũ trên mọi map và thiết bị.
2. Realtime, thông báo giữa các tab, kiểm tra mỗi 1,5 giây và kiểm tra khi quay lại màn hình giúp phiên cũ phát hiện mình đã bị thay.
3. Phiên cũ dừng đồng bộ, chặn ghi save cục bộ lúc tháo game, bỏ hàng chờ save, đóng thế giới và về đăng nhập với thông báo tài khoản đã đăng nhập ở nơi khác. Không gọi `auth.signOut()` khi bị đẩy ra, vì thao tác đó có thể đăng xuất cả tab mới dùng chung bộ nhớ auth.
4. Làm mới token không claim lại quyền chơi. Chỉ mở lại trang hoặc đăng nhập lại mới bắt đầu một claim mới.
5. Mỗi tài khoản chỉ vẽ một nhân vật trên map, kể cả lúc channel cũ chưa kịp đóng; không vẽ bản sao của chính người chơi hiện tại.

Save và xóa save chuyển qua `save_game_snapshot` / `delete_game_snapshot`, kèm instance UUID. Các hàm khóa cùng dòng với claim, kiểm tra cả instance và session ID trong JWT. Vì vậy save cũ đang chạy phải hoàn tất trước claim mới, hoặc bị từ chối sau claim; nó không thể ghi đè tiến trình của phiên thắng. Quyền ghi trực tiếp vào `saves` từ browser bị thu hồi, quyền đọc vẫn theo RLS chủ tài khoản. Các RPC chỉ được cấp cho `authenticated`.

Nếu chưa có migration hoặc không xác nhận được claim, client không mở game online và hiển thị hướng dẫn thử lại/liên hệ quản trị viên. Build offline không dùng cơ chế này. Tài khoản khác nhau vẫn chơi đồng thời bình thường.

## HUD: đánh thường + sáu ô chiêu + lướt

- Giữ nút đánh thường lớn và ba ô cũ ở vòng trong; thêm ba ô ở vòng ngoài, có đường cung vàng. Bay, auto, chọn mục tiêu và bình máu vẫn có nút riêng.
- Chọn chiêu trong **Kỹ Năng**, gán vào **ô 2–7**. Ô 1 luôn là đánh thường. Lướt luôn dùng Shift và không chiếm sáu ô.
- PC dùng phím **1–7**, hoặc J/Space cho đánh thường. Phím 5 đã là ô chiêu, không còn là phím lướt trong tỷ võ.
- Save bốn ô cũ giữ nguyên thứ tự, được bổ sung bằng các chiêu hợp lệ đang mở. Mặc định cho nhân vật mới có ba chiêu phái đầu và ba chiêu phổ thông; người chơi thay tự do khi đủ điều kiện mở chiêu mới.
- Giao thức pose, thông tin đối phương, lời mời tỷ võ và snapshot sân đấu đều nhận đủ bảy ô. Không gắn thêm kỹ năng khóa, sai phái, trùng chiêu hoặc lướt vào bộ chiêu.

## Xác nhận

- `npm test`: **317 tests / 51 files** qua. `npm run build` và `npm run lint` qua.
- Kiểm tra trình duyệt với hai người chơi qua relay Realtime cục bộ: thay chiêu ở ô 7 bằng nút thật, đồng bộ đủ bảy ô, bấm nút vòng ngoài hiển thị chiêu trên màn người đứng gần, phím 7 dùng được trong PK tay.
- Kiểm tra production boot/guard bằng backend giả lập cục bộ: đăng nhập sau giữ kết nối, trang cũ tháo canvas và về đăng nhập, save của instance cũ bị từ chối, các tài khoản khác không bị ảnh hưởng; thiếu RPC thì không vào game. Đây không phải kiểm tra thực thi SQL trên Supabase production.
- HUD vừa màn 667×375, 844×390 và PC 1440×900; nút chiến đấu nằm trong màn hình và không chồng lên nhau. Chưa kiểm tra trên iPhone vật lý.

Ảnh: [HUD mobile](previews/hud-sessions-hud-667.png), [HUD PC](previews/hud-sessions-hud-desktop.png), [bộ chiêu](previews/hud-sessions-loadout-mobile.png), [tỷ võ](previews/hud-sessions-duel-mobile.png), [phiên cũ đăng xuất](previews/hud-sessions-session-replaced.png), [tán tu map cao](previews/hud-sessions-wanderer-high-mobile.png).
