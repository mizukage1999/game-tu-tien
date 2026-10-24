# Cấp, chiến đấu và hành trình tu tiên

## Tiến trình và di chuyển

- Hai nhân vật vẫn xuất phát từ Vương Gia Thôn, trải qua tuổi thơ và nhập môn theo cốt truyện. Không còn chỉ số tuổi/thọ nguyên trên giao diện.
- Dùng Lv và EXP. EXP cần cho một cấp: `round(300 + 120 × Lv^1.65 + 15 × Lv²)`. Cấp tối đa 120; bình cảnh cần đột phá. Khuy Niết (91–100) → Tịnh Niết (101–110) → Toái Niết (111–120).
- Bỏ giới hạn cấp khi vào sơn dã và phó bản. Cấp đề nghị chỉ hướng dẫn độ khó; người cấp cao có thể chọn lại vùng cấp thấp trong Sơn Hà Đồ.
- Cổng cốt truyện thời thơ ấu, quyền sở hữu động phủ và danh vọng tông môn vẫn có ý nghĩa. Tàng Kinh Các cần 150 danh vọng; Linh Địa Hậu Sơn cần 350.
- Chạm minimap để mở bản đồ hiện tại/thế giới. Ký hiệu: ▲ nhân vật, ! NPC, ◇ cổng, • đối thủ, ♧ dược liệu, ◆ tương tác. Chạm ô trống trên bản đồ để dẫn đường; tuyến đường có chấm trắng nhỏ.

## Trang bị và kỹ năng

- Sáu ô trang bị được tính đầy đủ vào chỉ số, đồ rơi và cửa hàng. Cường hóa tối đa +12, chỉ dùng Đá Cường Hóa (mã vật phẩm `tinh_luyen_thach`, nhận từ phó bản). Số đá mỗi lần: 1/2/3/4 cho các khoảng +0–2/+3–5/+6–8/+9–11. Tỷ lệ lên +1 đến +12: 100%, 95%, 90%, 85%, 75%, 65%, 55%, 45%, 35%, 25%, 18%, 12%. Thất bại trừ đá, giữ cấp đồ, không vỡ đồ. Mỗi bậc cộng 12% chỉ số gốc; save cũ trên +12 được đưa về +12. Chỉ số cường hóa lưu theo mã vật phẩm vì túi đồ hiện dùng các chồng vật phẩm cùng loại.
- Có thêm Lôi Kích, Hỏa Liên, Mộc Linh Hồi Xuân, Kim Cang Hộ Thể và Phong Nhận. Lôi Kích/Phong Nhận học từ trưởng lão, yêu cầu danh vọng và cống hiến.
- Bốn ô chiến đấu gồm đánh thường cố định ở ô 1 và ba chiêu tự chọn ở ô 2–4. Mở **Kỹ năng**, chọn ô 2–4 rồi gán chiêu; gán chiêu đã có sẽ đổi chỗ. Lướt là nút thứ năm độc lập, dùng Shift, không chiếm ô chiến đấu. HUD và tỷ võ dùng cùng bộ chiêu, MP và hồi chiêu riêng.
- Mobile giữ bốn menu thường dùng và nút **Thêm**; Tông Môn, Tiên Ngọc và các bảng còn lại nằm trong **Thêm**, tránh che phần trên sân chiến đấu.
- Nhân vật trưởng thành dùng atlas 4×2 nhỏ, ít khung hình. NPC thành được thu về chiều cao 112 đơn vị, tương đương phần hình nhân vật. Ẩn hoàn toàn vũ khí cầm tay; trang bị và chỉ số vẫn giữ nguyên. Nút ngự kiếm nhanh cạnh Auto: chân ở trên kiếm, kiếm ở trên bóng mặt đất. Từ Vấn Đỉnh chỉ ẩn kiếm, vẫn bay. Tốc độ ngự kiếm = 1,45 + 0,01 × chỉ số đại cảnh giới (Trúc Cơ 1,46; Vấn Đỉnh 1,51; Toái Niết 1,56).

## Tỷ võ bằng tay

- **Tông Môn → Luyện tay với Mộc Nhân** hoạt động offline. **Mời người chơi tỷ võ** dùng tài khoản và kênh social đã cấu hình.
- Đếm ngược 3 giây, trận tối đa 120 giây. Di chuyển WASD/mũi tên, kéo sân hoặc bấm nút hướng. Bốn chiêu chiến đấu và nút lướt riêng; không tự đánh thay người chơi. Nút **Trở về** luôn có ở thanh dưới; nút kết quả nhận thao tác chạm riêng, không bị sân đấu bắt giữ con trỏ.
- Chiêu báo vùng trước khi trúng; có thể di chuyển né, lướt, hồi phục, tạo khiên. Hai vật cản chặn di chuyển và lướt. Hết giờ so tỷ lệ HP, bằng nhau hòa. Rời trận tính bỏ cuộc; mất kết nối kết thúc trận.
- Thế giới Phaser tạm dừng khi tỷ võ và tiếp tục sau khi đóng kết quả. Không mở tỷ võ khi chết, đang bế quan, trong phó bản hoặc đang độ kiếp.
- Đồng bộ hiện dùng trình duyệt người gửi lời mời làm chủ trận qua Supabase Broadcast. Đây chưa phải máy chủ chiến đấu chuyên dụng; các kiểm tra offline không xác nhận trải nghiệm mạng giữa hai tài khoản thật.

## Tông môn, tán tu, linh thú

- Nhiệm vụ săn quái, hái dược, luyện chế, vượt phó bản, luận kiếm. Nhận/trả tại Đại Thừa Viện hoặc Linh Sơn Tông, mỗi loại một lần/ngày game. Danh vọng tăng bậc từ Tạp Dịch đến Trưởng Lão; cống hiến dùng học bí thuật.
- **Ghi danh** ở tông môn hiện tại để đặt nơi trở về khi bị hạ gục. Mặc định Đại Thừa Viện. Chết ở sơn dã/phó bản chuyển về đúng tông môn, đầy sinh lực; không đứng dậy ở chỗ cũ sau 3 giây. Phó bản đang chạy tính thất bại.
- Tán tu có tên, sức mạnh khác nhau, chỉ xuất hiện ở sơn dã; phạm vi truy đuổi có giới hạn. Đi vào phạm vi phát hiện hoặc chủ động đánh sẽ giao chiến. Tên và khung mục tiêu không lộ cấp/HP.
- Thu phục bằng dấu ấn chiến thắng: Tuyết Hồ từ Linh Thú, Xích Hồ từ Hỏa Hồ, Ngọc Lộc từ Thanh Mộc Thú, Kim Văn Hổ từ Thạch Linh Thú, Ảnh Lang từ tinh anh U Minh Trạch, Linh Hạc từ tinh anh Hàn Băng Nguyên.
- Hạc hồi phục, lộc tạo khiên, hổ trọng kích, xích hồ đánh lan, tuyết hồ/ảnh lang làm chậm. Nuôi dưỡng tăng bậc; đủ bậc và nguyên liệu mở hai lần tiến hóa. Không có nút mua linh thú bằng tiền hoặc Tiên Ngọc.

## Bí cảnh và thiên kiếp

- Năm map riêng: Băng Tuyết Động, Hỏa Diễm Cốc, Lôi Đình Cổ Điện, U Minh Lang Địa, Huyền Thiên Kiếp Đài. Mỗi map có đường trống tới điểm sinh quái, boss và lối ra; vật cản và nền địa hình khác nhau.
- Mỗi tầng có bốn độ khó, lượt vào và giới hạn thời gian. Boss có hình riêng, HP cao, báo chiêu, gọi trợ thủ và cuồng nộ khi dưới nửa HP. Bảng vào phó bản hiển thị lực chiến đề nghị để chuẩn bị đồ trước khi đánh solo.
- Rơi trang bị đủ sáu ô theo bảng xác suất; thưởng vượt ải có nguyên liệu cường hóa, Kiếm Phổ, Linh Thạch, thưởng lần đầu. Tổ đội social hiện có thể mời/tham gia; phó bản vẫn là phiên chiến đấu solo, chưa đồng bộ nhiều thành viên vào cùng một instance.
- Đột phá tại tông môn: đầy EXP bình cảnh, đủ Linh Khí/Linh Thạch và một Phá Cảnh Đan. Trả nguyên liệu khi bắt đầu; vượt bốn đợt sét trong 18 giây bằng cách né vùng báo. Sống sót mới lên cảnh giới; thất bại mất nguyên liệu và về tông môn. Thành công tăng chỉ số, đổi sắc nhân vật và hào quang, nhận Thiên Lôi Tinh.

## Bật Tiên Ngọc trên server

Repo chưa có `.env.local`/kết nối Supabase để triển khai hoặc kiểm tra RPC thật. Giao diện offline khóa cấp/đổi ngọc.

1. Cấu hình Supabase theo hướng dẫn hiện có và chạy `supabase/schema.sql`.
2. Chạy `supabase/combat-expansion.sql` trong SQL Editor. Ví, vật phẩm sở hữu và sổ giao dịch nằm trên server; client không được ghi trực tiếp.
3. Tài khoản admin phải đăng ký trước. Thay username trong câu lệnh bootstrap cuối file SQL rồi thực thi từ SQL Editor. Không có mật khẩu admin mặc định hay quyền admin lấy từ localStorage.
4. Đăng nhập admin, mở **Tiên Ngọc** và cấp theo username/số lượng/lý do. Người nhận đổi **Thiên Ngọc Tiên Ấn** giá 200 ngọc. RPC kiểm tra quyền, khóa ví khi đổi và ghi sổ; pháp bảo sở hữu theo tài khoản, không dựa vào save client.

## Hình ảnh và xác minh

Atlas mới ở `public/assets/maps/hero-wang-simple.png`, `hero-li-simple.png`, `dungeon-bosses-v3.png`. Tạo bằng `image_gen` tích hợp, prompt và đường dẫn nguồn lưu tại [combat-assets.json](combat-assets.json). Atlas được cắt, căn chân và thu gọn trong `expansionArt.ts`.

Chạy `npm test`, `npm run build`, `npm run lint`. Kiểm tra trình duyệt bổ sung dùng kích thước 844×390, iPhone dọc 390×844 và PC; gồm bản đồ, đổi ô chiêu, PK, tán tu gây sát thương, ngự kiếm, độ kiếp, phó bản và trở về tông môn. Cần kiểm tra bổ sung với hai tài khoản/Supabase thật trước khi phát hành hệ thống online.
