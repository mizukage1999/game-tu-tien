# Tỷ võ xếp hạng và hoạt động thế giới

## Kích hoạt server

Sau khi triển khai client mới, chạy toàn bộ **[supabase/competition-upgrade.sql](../supabase/competition-upgrade.sql)** trong Supabase SQL Editor của dự án. Đây là bản nâng cấp cho server đã có tài khoản, phiên chơi, quản trị và thư thưởng; không dùng service role trong trình duyệt. File gộp chạy trong một transaction và có thể chạy lại. Nó cập nhật danh mục trang bị/BXH, mở nhận thư hoạt động, thêm bảng và RPC mới; giữ nguyên quy tắc bảo trì và chặn tài khoản hiện có.

Workspace không có kết nối quản trị database live. Chưa chạy migration lên server thật. Client hiển thị thông báo chưa kích hoạt khi RPC chưa tồn tại, không tạo điểm hay thư giả.

Khi sửa danh mục, sinh lại theo thứ tự:

```powershell
node scripts/generate-leaderboard-sql.mjs
node scripts/generate-admin-catalog.mjs
node scripts/generate-admin-delivery-sql.mjs
npm run competition:generate
npm run competition:verify
```

## Tỷ võ xếp hạng

Mở **Tỷ Võ Xếp Hạng** trên top menu. PC tiếp tục có hai hàng menu; mobile giữ bốn mục nhanh và Thêm. Cài Đặt nằm cuối.

- Ghép người chơi online đã nhập môn, tối đa chênh một đại cảnh giới và 15 cấp. Không ghép bản thân hoặc tự thêm bot. Có thể hủy hàng chờ.
- Server lấy bộ chiêu và thuộc tính từ save trước khi ghép; chúng cố định trong trận. Giữ hệ phái, đồ và điều khiển tay hiện có.
- Mùa bắt đầu thứ Hai theo giờ Việt Nam. Mỗi mùa khởi điểm 1.000; thắng +20, thua −20 (sàn 0), hòa không đổi điểm. Có bậc Tân Tú/Tinh Anh/Chân Nhân/Tông Sư/Thiên Tôn và top 50.
- Hai bên phải vào sân trước khi tính trận. Hai tài khoản xác nhận cùng kết quả thì server mới tính điểm; kết quả khác nhau chuyển sang tranh chấp, không tính điểm. Lệnh gửi lại không cộng lặp.
- Rời trận sau khi cả hai đã vào sân tính thua. Nếu một bên tiếp tục liên lạc còn bên kia mất heartbeat hơn 30 giây, server xử lý bên mất kết nối thua. Hai bên cùng mất kết nối thì trận hết hạn, không tự chọn người thắng.
- Mỗi cặp chỉ tính điểm hai trận/ngày Việt Nam; mỗi tài khoản tối đa 20 trận tính điểm trong 24 giờ. Trận vượt giới hạn vẫn chơi, không tạo thêm điểm.
- Trận Mộc Nhân và thách đấu bạn bè thông thường không đổi điểm xếp hạng. Phiên bản này chưa cấp vật phẩm theo hạng/mùa.

## Trang bị boss theo phái

Tỷ lệ **55% phái người nhận / 45% các phái khác** được áp dụng sau khi một món trang bị thực sự rơi. 45% chia đều cho bảy phái còn lại. Không thay tỷ lệ rơi trang bị, phẩm chất, số lượng vật phẩm hay bảng nguyên liệu.

Đồ boss có tên phái và yêu cầu phái tương ứng; vũ khí mang tên Kiếm/Linh Phù/Cung/Song Đao/Hỏa Ấn/Hồn Phiên/Thiền Trượng/Ngọc Giản. Mỗi món vẫn là một vật thể riêng với cường hóa riêng. Đồ chung cũ tiếp tục sử dụng được. Đồ khác phái được giữ trong túi, chưa mở chợ chuyển đồ thật.

Trong map online, loot được chia theo đóng góp trước, sau đó chọn phái theo đúng người nhận. Trang bị đã có phái không bị quay lại khi nhận qua mạng. Đồ thưởng hoàn thành phó bản cũng dùng quy tắc này.

## Thiên Giáng Dị Bảo

Mở 25 phút mỗi ba giờ, từ 00:00 giờ Việt Nam. Mỗi đợt chọn một map dã ngoại chung cho mọi người và một vị trí ngẫu nhiên trên vùng đi được, có tọa độ thông báo khi tới map.

Thiên thạch rơi, xuất hiện bảo vật và Kim Lân Thủ Bảo. Thủ vệ dùng chiến đấu, HP, chiêu báo trước và chia thưởng đóng góp hiện có. Sau khi hạ đúng thủ vệ của đợt, người có đóng góp tới gần bảo vật và chạm để giữ vị trí năm giây. Di chuyển, ra chiêu, bị đánh hoặc mở giao diện làm gián đoạn. PK tiếp tục tuân theo chế độ/vùng an toàn hiện có, không tự bật PK cho người chơi.

Server chốt **một người đoạt bảo mỗi đợt**. Thưởng chính gửi thư: 150 Linh Thạch, 3 Đá Cường Hóa, 2 Yêu Đan; 1,5% nhận thêm Ngọc Hộ Thân. Chiến đấu với thủ vệ còn có đồ rơi theo bảng boss. Thư chính không nhận lặp khi mất mạng, đăng nhập lại hoặc gửi lại yêu cầu.

## Động Phủ Viễn Cổ

Mở 40 phút mỗi ba giờ, từ 01:00 giờ Việt Nam. Đây là khu khám phá PvE riêng trong phiên bản này. Mỗi đợt có seed chung để tạo một mê cung mới, 24 phòng nối liên thông, hai phong ấn, hai rương phụ, sáu vị trí bẫy và một cổ thú.

Bẫy có giai đoạn báo trước rồi gây sát thương thật, có thể né. Cổ Đại Thạch Vệ không nhận sát thương trước khi phá cả hai phong ấn. Rương phụ gửi 20 Linh Thạch và 1 Đá Cường Hóa qua thư; thưởng chính sau khi hạ đúng cổ thú dùng cùng bảng Dị Bảo. Mỗi rương/thưởng chính nhận một lần mỗi tài khoản/đợt.

Có cổng rời động phủ. Hết giờ tự trở về tông môn; chết trở về tông môn theo luồng hiện có. Save không giữ nhân vật bên trong mê cung đã hết hạn. Hai vật thể cơ quan/rương cần đến gần mới tương tác được, menu mở không điều khiển được thế giới phía sau.

## Mô hình tin cậy hiện tại

Bảng điểm và biên nhận thưởng nằm trong schema riêng, không cho client đọc/sửa bảng trực tiếp. RPC kiểm tra phiên đăng nhập, khóa giao dịch, mốc thời gian và quyền nhận; thư dùng cơ chế revision chống autosave cũ ghi đè thưởng.

Mô phỏng chiến đấu vẫn chạy ở peer chủ phòng như hệ thống hiện tại. Server chưa tự mô phỏng toàn bộ giao tranh. Xếp hạng dùng xác nhận hai bên, giới hạn lượt và heartbeat; điều kiện hoạt động dựa trên ghi nhận đúng thủ vệ và save, chưa phải chứng thực chống client bị sửa. Các bảo vệ này không chứng minh mọi đầu vào chiến đấu hợp lệ. Cần chuyển mô phỏng/biên nhận giao tranh sang server trước khi dùng cho giải có giá trị lớn.

## Sprite

Dùng skill imagegen, công cụ tích hợp; không dùng CLI/API. [Atlas PNG alpha](../public/assets/ui/world-activities-v1.png) có kích thước thực 1448×1086, lưới 8×6, mỗi ô 181×181. Giữ alpha gốc. Chỉ tải khi mở hoạt động hoặc xuất hiện hoạt động tại map, không thêm vào nhóm ảnh khởi động.

Prompt và thông số nguồn lưu tại [competitive-art.json](competitive-art.json). Sprite tạo mới; chữ, thời gian, nút, điểm hạng, HP, bẫy và nhận thưởng đều do code tương tác điều khiển.

Bản giao tới trình duyệt dùng WebP cùng kích thước, giảm từ khoảng 2.844 KB xuống 1.040 KB. Kiểm tra asset xác nhận hash nguồn, kích thước atlas và bản ghi alpha.

## Kiểm chứng

- `npm test`: 517 bài kiểm thử, 100 file đều đạt; có kiểm tra phân phối 55/45 trên cả tám phái, cấm mặc đồ khác phái, đường đi mê cung, xử lý kết quả tỷ võ bị trễ và gửi lại khi mất mạng.
- `npm run lint` và `npm run build`: đạt; build kiểm tra 83 ảnh giao tới trình duyệt trước khi biên dịch.
- `npm run competition:verify`: 34 kiểm tra trên Postgres cục bộ; gồm chạy gói nâng cấp hai lần, giữ nguyên hàm kiểm soát truy cập/bảo trì, kết quả tỷ võ không cộng lặp, giới hạn tính điểm, quyền tài khoản, thời gian hoạt động và thư thưởng không nhận trùng.
- `npm run leaderboard:verify`: 30 kiểm tra; so sánh trực tiếp chỉ số, lực chiến, bộ chiêu và trang bị chung/theo phái của tám nhân vật tại tám mốc cấp với phép tính của client.
- Chạy Chrome với hai tài khoản thử nghiệm và RPC Postgres cục bộ: ghép trận, dùng kỹ năng, bỏ cuộc và tính điểm hai bên; đánh thủ vệ, giữ vị trí năm giây, nhận thư và nhận vật phẩm vào túi. Động phủ đã thử bẫy gây sát thương, hai phong ấn, hạ cổ thú, nhận thư và cổng ra. Không có lỗi JavaScript trong lượt kiểm tra này.
- Kiểm tra bố cục ở 1440×900, 844×390 và 640×360. Đây là kiểm tra trình duyệt, chưa thay thế kiểm tra trực tiếp trên Redmi Note 11/Safari iPhone và chưa chứng minh FPS trên máy thật.
