# Rà soát hành trình chơi Cửu Huyền — 28/10/2026

Các điều chỉnh sau rà soát được ghi riêng tại [Điều chỉnh hành trình chơi](gameplay-cohesion-update.md); phần dưới giữ nguyên kết quả tại thời điểm kiểm tra.

## Nhận định

Game đã có tuyến nhập môn và vòng chơi cá nhân có thể nối tiếp nhau. Phần mở đầu có cốt truyện, dẫn đường, chỉ dẫn điều khiển, thử luyện đầu tiên có boss báo chiêu và phần thưởng chắc chắn. Đây là nền đủ để tổ chức một đợt chơi thử có hướng dẫn.

Chưa có đủ bằng chứng để kết luận game giữ chân người chơi lâu dài. Những điểm yếu lớn nhất là tổ đội chưa nối vào phó bản, thưởng boss công khai chỉ dành cho người kết liễu, chi phí đột phá cuối tăng rất mạnh và nội dung tạo lựa chọn mới thưa dần ở cấp cao. Nên hoàn thiện các liên kết này trước khi thêm nhiều màn hình hoặc hệ thống mới.

Đây là đánh giá từ code, dữ liệu và kiểm tra cục bộ. Không phải kết quả khảo sát người chơi hoặc phép đo retention trên server thật.

## Đã kiểm tra

- Toàn bộ **418 kiểm thử / 74 tệp** đều qua. Bộ test gồm nhiệm vụ, điều hướng, đồ riêng từng món, kỹ năng, tu luyện, phó bản, chia sẻ thế giới, phiên đăng nhập, chat, ví ngọc và giao diện. JSDOM có một thông báo không hỗ trợ chuyển trang trong test AuthScreen; test vẫn qua.
- Phân tích dữ liệu đang thực sự được game import: 34 nhiệm vụ, 29 nhiệm vụ trong tuyến Tiên Lộ gồm 10 nhiệm vụ mở đầu, 27 map, 8 nhân vật, 95 định nghĩa kỹ năng, 23 định nghĩa phó bản. Các biến thể độ khó và bí danh dùng lại nội dung; các con số này không đồng nghĩa với 23 trải nghiệm phó bản hoàn toàn khác nhau.
- Không thấy tham chiếu thiếu trong các trường đã đối chiếu: nhiệm vụ tiên quyết, NPC giao/trả/nói chuyện, mục tiêu tiêu diệt, điểm tương tác, phó bản nhiệm vụ và vật phẩm thưởng. Điều này không thay thế kiểm tra mọi đường đi và mọi tổ hợp trạng thái.
- Chrome/Canvas, hồ sơ offline riêng, màn hình mobile giả lập: tạo Thẩm Nguyệt, hoàn tất đủ 10 nhiệm vụ Vương Gia Thôn qua logic dẫn đường/tương tác/hội thoại thật, nhận nhập môn, đi qua cổng và hoàn thành gặp trưởng lão ở Đại Thừa Viện. Không cấp trước trạng thái nhiệm vụ hoặc tài nguyên; không có exception chưa xử lý. Vòng cập nhật được chạy tăng tốc, nên không dùng kết quả này làm số đo thời lượng chơi hay FPS trên điện thoại thật.
- Những phần sau nhập môn được rà qua code, dữ liệu và bộ kiểm thử; lần rà này không chơi thủ công toàn bộ đến cấp 120 và không dùng hai tài khoản Supabase thật.

## Mức độ liền mạch theo chặng

| Chặng | Đã nối được | Chỗ còn đứt hoặc dễ mất hứng |
| --- | --- | --- |
| Tạo nhân vật → Vương Gia Thôn → nhập môn | Ngoại hình nhỏ, dẫn đường, nhận/trả nhiệm vụ, chuyển tuổi và đến trưởng lão hoạt động | 10 nhiệm vụ đầu chủ yếu nói chuyện, tương tác, hái thuốc; chưa có quyết định chiến đấu/xây dựng nhân vật. Trong lượt thử, nhập môn xong vẫn cấp 1. |
| Nhập môn → chuẩn bị → Ngọc Ấn → kiếm đầu tiên | Có hướng dẫn tay, lướt, đan dược, boss báo đòn, thử lại và đồ chắc chắn | Quà Alphatest cấp 99 làm thử luyện cấp 4–5 mất độ khó; không dùng lượt thử có quà này để đánh giá cân bằng tân thủ. |
| Trang bị → phó bản → cường hóa → đột phá | Đồ riêng từng món, đá cường hóa, luyện đan và vượt kiếp cùng ảnh hưởng sức mạnh thật | Nguyên liệu đột phá tăng theo cấp số nhân nhưng lượng rơi tối đa tăng ít. Thất bại thiên kiếp mất toàn bộ chi phí đã trả. |
| Bạn bè → tổ đội → cùng săn boss/phó bản | Có mời đội, chat, danh sách đội, cùng thấy quái/chiêu ở map công khai | Phó bản tắt kết nối thế giới, chưa có phiên đội dùng chung; map công khai chưa chia thưởng theo đóng góp/đội. |
| Đồ dư → bày bán → ngọc → mua mục tiêu mới | Mua NPC và một món đổi ngọc có server; ví và thư nhận quà có kiểm tra quyền | Bày bán chỉ lưu nháp, trao đổi trực tiếp và thanh toán chưa mở. Chưa có vòng kinh tế giữa người chơi. |
| Cấp cao → mục tiêu quay lại | Có 12 cảnh giới, nhiều mức độ khó, linh thú, cường hóa và bí thuật | Kỹ năng riêng mở hết ở cấp 40; khu luyện cấp đề nghị kết thúc ở 99, trong khi trần nhân vật là 120. Nội dung sau đó thiên về tăng số hơn là mở kiểu chơi mới. |

## Những điểm nên giữ

1. **Boss Ngọc Ấn và kiếm đầu tiên** có lý do để chuẩn bị, dùng kỹ năng tay, né đòn, chiến thắng và nhận món đồ cụ thể. Không cần thay bằng quay thưởng ngẫu nhiên. Nguồn: [openingAdventure.ts](../src/data/openingAdventure.ts), [OpeningGuide.tsx](../src/ui/OpeningGuide.tsx).
2. **Hướng dẫn nằm trong việc đang làm**, có dẫn đường và nhắc trạng thái thay vì nhiều cửa sổ chặn màn hình. Nguồn: [questNav.ts](../src/game/systems/questNav.ts), [QuestPanel.tsx](../src/ui/QuestPanel.tsx).
3. **Kỹ năng đã khác nhau về cách dùng**, có đường thẳng, hình quạt, phạm vi quanh người, giữ chân, hồi phục và lá chắn; không chỉ khác màu. Tám hệ có thể là trục tạo bản sắc tiếp theo. Nguồn: [heroSkills.ts](../src/data/heroSkills.ts).
4. **Thu phục linh thú bằng chiến đấu**, trang bị cường hóa riêng từng món và chỉ tăng cảnh giới khi vượt kiếp đều nối hành động với kết quả thật. Nguồn: [life.ts](../src/game/systems/life.ts), [equipment.ts](../src/game/systems/equipment.ts), [cultivation.ts](../src/game/systems/cultivation.ts).
5. **Tính năng chưa mở có ghi rõ trạng thái**, không tự trừ tiền hoặc tạo giao dịch giả. Cần giữ sự rõ ràng này khi phát hành. Nguồn: [MarketPanel.tsx](../src/ui/menus/MarketPanel.tsx), [PremiumPanel.tsx](../src/ui/menus/PremiumPanel.tsx).

## Các vấn đề ưu tiên

### 1. Cao — Tổ đội chưa tạo ra trải nghiệm phó bản cùng nhau

`WorldScene.startMultiplayer()` bỏ qua map có `arena` hoặc `private`. Phó bản có run/quái riêng ở từng client. Danh sách tổ đội hoạt động, nhưng chưa có instance chung để cả đội chiến đấu và cùng nhận kết quả.

Hệ quả: người chơi mời bạn vào đội nhưng không nhận được lợi ích hợp tác mà họ trông đợi từ boss khó. Các chiêu hỗ trợ hiện chủ yếu hồi/chắn cho bản thân, chưa tạo nhiều tương tác giữa vai trò trong đội.

Đề xuất: trước tiên nối **một phó bản 2–3 người** với cùng boss/HP/đợt quái, điều kiện sẵn sàng, vào/rời đội, mất kết nối và thưởng cho người tham gia hợp lệ. Sau đó mới mở rộng. Nguồn: [WorldScene.ts](../src/game/scenes/WorldScene.ts), [SharedWorld.ts](../src/game/systems/SharedWorld.ts).

### 2. Cao — Thưởng quái/boss online dựa vào đòn kết liễu

`SharedWorld.killed()` gửi `killer: m.lastAttacker`; nhánh nhận sự kiện chỉ gọi `rewardMonster()` cho client có khóa trùng `killer`. Do đó chưa có cơ chế chia theo tổng đóng góp, hỗ trợ hoặc thành viên đội. Đây không chỉ là thiếu bảng xếp hạng giao diện.

Hệ quả: người gây phần lớn sát thương có thể không được EXP/đồ nếu người khác kết liễu. Cách thưởng này làm việc cùng săn boss kém hấp dẫn và có nguy cơ gây tranh chấp.

Đề xuất: xác định quyền nhận theo đóng góp hợp lệ và phạm vi tham chiến; chia thưởng đội với điều kiện chống đứng ké. Giữ phần thưởng hiếm riêng nếu muốn cạnh tranh, nhưng tránh để toàn bộ kết quả phụ thuộc một đòn cuối. Nguồn: [SharedWorld.ts](../src/game/systems/SharedWorld.ts), [WorldScene.rewardMonster](../src/game/scenes/WorldScene.ts).

### 3. Cao — Chi phí đột phá cuối có nguy cơ tạo công việc lặp lại quá dài

Giữ đúng yêu cầu số đan gấp đôi: 1 → 2 → … → 1.024. Một viên cần 6 Linh Chi, 4 Yêu Đan, 4 Ngưng Lộ và 120 Linh Khí. Riêng Tịnh Niết → Toái Niết cần:

| Nguyên liệu | Số lượng |
| --- | ---: |
| Linh Chi | 6.144 |
| Yêu Đan | 4.096 |
| Ngưng Lộ | 4.096 |
| Linh Khí dùng luyện đan | 122.880 |

Nguồn tinh anh không phải boss có tỉ lệ Yêu Đan tốt nhất đang là 35%, mỗi lượt một viên. Nếu chỉ dùng nguồn này, kỳ vọng khoảng **11.703 lượt hạ quái** để đủ Yêu Đan cho lần cuối. Đây là phép tính kỳ vọng, không phải số bắt buộc hay thời gian thực tế; chưa tính boss, nhiệm vụ hoặc nguyên liệu đã có. Boss cấp cao hiện cũng chỉ cho tối đa vài viên trong một lượt rơi.

Đề xuất: vẫn giữ gấp đôi số đan nhưng tăng nguồn thu theo tầng thử thách, thêm thưởng chắc chắn theo mốc boss/phó bản hoặc cách đổi nguyên liệu cấp cao. Đo thời gian kiếm đủ một lần đột phá và thời gian phải làm lại khi thất bại. Độ khó nên còn đến từ vượt kiếp và chuẩn bị cách đánh. Nguồn: [cultivationBalance.ts](../src/data/cultivationBalance.ts), [progression.ts](../src/game/systems/progression.ts), [gameStore.ts](../src/store/gameStore.ts).

### 4. Cao — Quà Alphatest làm sai lệch phép thử trải nghiệm tân thủ

Gói cấp 99 là tính năng đã yêu cầu và không nên tự ý bỏ. Tuy nhiên, chỉ số công cơ bản cấp 99/Khuy Niết là 1.622; Ngọc Ấn Thủ Hộ chỉ có 1.300 HP, chưa tính vũ khí và kỹ năng. Đây là so sánh thông số, không phải phép đo số đòn thực tế. Người nhận quà rồi đi tuyến nhập môn sẽ khó cảm nhận đúng thử thách của boss đầu.

Đề xuất: giữ nguyên gói, nhưng tách kịch bản kiểm thử **nhân vật tăng trưởng bình thường** và **nhân vật Alphatest cấp 99**. Giao diện nên hướng nhân vật đã nhận quà tới thử thách phù hợp, đồng thời vẫn cho hoàn thành cốt truyện. Không dùng số liệu của nhóm cấp 99 để kết luận việc lên cấp thường dễ/khó. Nguồn: [alphatest-mail.sql](../supabase/alphatest-mail.sql), [openingAdventure.ts](../src/data/openingAdventure.ts).

### 5. Vừa — Phần đầu nhiều dẫn truyện, ít lựa chọn chủ động

Mười nhiệm vụ mở đầu có tổng 120 EXP, trong khi cấp đầu cần 435 EXP. Lượt đi thử kết thúc nhập môn ở cấp 1. Việc đổi sang ngoại hình trưởng thành là một phần thưởng nhìn thấy, nhưng trước đó phần lớn hành động là đi/nói chuyện/tương tác lặp lại; người thích chiến đấu có thể chưa thấy điểm khác biệt giữa tám phái.

Đề xuất: giữ không khí làng và gia đình; rút bớt lượt đi/trả trùng nhau, thêm một bài tập tay an toàn hoặc cho xem rõ chiêu đặc trưng trước khi nhập môn. Mục tiêu thiết kế là sớm cho người chơi tự làm được một việc đáng nhớ, không chỉ bấm đi tiếp. Chưa có số đo thời gian thật để kết luận đoạn này dài bao nhiêu phút. Nguồn: [world.ts](../src/data/world.ts), [journey.ts](../src/game/systems/journey.ts).

### 6. Vừa — Nội dung cấp cao chưa có nhịp mở mới tương xứng

Game có trần 120, nhưng kỹ năng riêng cuối mở ở cấp 40. Khu luyện cấp đề nghị cao nhất là 99; cấp đề nghị gốc của phó bản cao nhất là 90 và có biến thể khó hơn. Không phải không có quái cấp cao: dữ liệu spawn/phó bản có loài đến cấp 116. Vấn đề là thiếu tuyến mục tiêu và thay đổi cách chơi rõ cho phần cuối.

Tổng thưởng EXP của 29 nhiệm vụ Tiên Lộ là 5.680, chỉ tương đương cấp 5 nếu chỉ cộng riêng lượng này từ cấp 1 và bỏ bình cảnh. Con số này không bao gồm EXP đánh quái, tu luyện hoặc đan dược; nó cho thấy cốt truyện hiện tập trung vào phần đầu, không phải một chiến dịch dẫn người chơi đến 120.

Đề xuất: thêm mốc chiến đấu/build trước khi thêm cảnh giới: boss buộc né/hủy chiêu, phối hợp vai trò, lựa chọn trang bị hoặc kỹ năng phục vụ mục tiêu cụ thể. Không nhất thiết thêm 10 hệ thống mới. Nguồn: [heroSkills.ts](../src/data/heroSkills.ts), [scale.ts](../src/game/systems/scale.ts), [immortal.STORY_ORDER](../src/game/systems/immortal.ts).

### 7. Vừa — Kinh tế và tông môn còn thiếu phần thưởng xã hội dài hạn

Chợ người chơi, trao đổi và nạp tiền chưa mở theo lựa chọn làm giao diện trước. Shop ngọc có 1/6 món đổi thật. Tông môn có 5 loại nhiệm vụ, tăng danh vọng/cống hiến và hai bí thuật, nhưng thành viên hiện là danh sách trực tuyến và chưa có nhiều mục tiêu chung của một cộng đồng.

Đề xuất: trong đợt test chỉ quảng bá những việc chơi được. Chưa cần mở thanh toán; ưu tiên có nơi dùng đồ dư và một mục tiêu đội/tông môn chung có kết quả nhìn thấy. Chợ thật chỉ nên mở sau khi server bảo vệ chuyển vật phẩm, tiền, số lượng và xử lý thử lại giao dịch. Nguồn: [market-ui.md](market-ui.md), [premiumCatalog.ts](../src/data/premiumCatalog.ts), [adventure.ts](../src/game/systems/adventure.ts).

### 8. Vừa — Cần nói rõ quy tắc PK và hai loại “ngày”

`mayPk()` xét chế độ của người tấn công, tông môn và trạng thái trẻ nhỏ; không xét chế độ Hòa bình của người bị đánh hoặc vùng an toàn trên map. Hiện Hòa bình có nghĩa không chủ động PK, không bảo đảm miễn bị đánh. Bản đồ công khai trong thành/tông môn vẫn tham gia SharedWorld. Quy tắc này cần được nói rõ, và nên cân nhắc vùng an toàn tại nơi làm nhiệm vụ đầu.

Nhiệm vụ tông môn dùng ngày game (30 giây); lượt phó bản dùng ngày lịch của client. Không nên cùng quảng bá như một vòng “hằng ngày” duy nhất. Nếu xây hoạt động ngày thật, cần mốc reset server và diễn đạt thống nhất.

Nguồn: [worldProtocol.mayPk](../src/net/worldProtocol.ts), [WorldScene.ts](../src/game/scenes/WorldScene.ts), [life.DAY_MS](../src/game/systems/life.ts), [adventure.ts](../src/game/systems/adventure.ts), [dungeon.todayKey](../src/game/systems/dungeon.ts).

### 9. Trước phát hành cạnh tranh — Đồng bộ client chưa phải xác nhận chiến đấu bởi server

Map công khai do một peer được bầu mô phỏng; chỉ số chiến đấu và save phần lớn vẫn xuất phát từ client. Có kiểm tra cấu trúc, phiên, hướng/tầm/cooldown và một số giới hạn; ví Tiên Ngọc và nhận thư đã có RPC xác thực riêng. Những điều này không đồng nghĩa toàn bộ EXP/đồ/kết quả PK đã được server kiểm chứng.

Không thấy sự cố gian lận trong lần rà này, nhưng cần đưa phần thưởng giá trị, quyền sở hữu vật phẩm và kết quả cạnh tranh sang xác nhận server trước khi mở chợ thật/xếp hạng có thưởng. Đồng thời cần thử trực tiếp Redmi Note 11 và iPhone, hai máy online và mất mạng/đổi host. Mô phỏng Chrome không chứng minh ổn định 60 FPS hay hết lỗi văng trên máy thật.

Nguồn: [SharedWorld.ts](../src/game/systems/SharedWorld.ts), [worldProtocol.ts](../src/net/worldProtocol.ts), [single-session.sql](../supabase/single-session.sql), [mobile-startup-stability.md](mobile-startup-stability.md).

## Thứ tự cải thiện đề xuất

1. **Khép kín buổi chơi đầu:** tạo nhân vật → nhập môn → học đánh/lướt → thắng Ngọc Ấn → nhận và mặc kiếm → cường hóa lần đầu → biết nguồn nguyên liệu đột phá. Có tuyến test thường riêng với Alphatest 99.
2. **Làm một trải nghiệm hợp tác thật:** một phó bản chung, thưởng tham gia hợp lệ và chia thưởng boss công khai. Đây là cách tận dụng ngay bạn bè/chat/tổ đội đã có.
3. **Chỉnh nhịp tiến triển:** giữ số đan gấp đôi, đo thời gian kiếm nguyên liệu, nâng nguồn theo độ khó; bổ sung mốc đổi cách chơi sau cấp 40. Phân biệt nhiệm vụ ngày game với hoạt động ngày thật.
4. **Sau đó mở kinh tế và cạnh tranh:** chuyển quyền sở hữu/phần thưởng quan trọng sang server, rồi chợ thật hoặc xếp hạng có thưởng. Tránh đưa nhiều mục chưa mở lên thành lời hứa chính của game.

## Cách biết game có đủ thu hút hay chưa

Chưa có dữ liệu để chấm điểm hấp dẫn hoặc khẳng định giữ chân tốt. Đợt test tiếp theo nên ghi nhận riêng cho hai nhóm có/không nhận gói 99:

- Từ tạo nhân vật đến nhập môn, đến lần đánh đầu tiên và lần thắng boss đầu tiên: bao lâu, thoát ở bước nào.
- Người chơi có tự tìm được kỹ năng, mặc kiếm, luyện đan và biết việc tiếp theo mà không cần người hướng dẫn không.
- Số lần chết/thử lại tại boss, lý do thất bại và mức độ đọc được vùng báo chiêu trên mobile.
- Người mời được bạn vào đội có thực sự cùng hoàn thành một mục tiêu và cùng có thưởng không.
- Thời gian kiếm đủ một lần đột phá; số lượt chơi để có một nâng cấp có ý nghĩa.
- Tỉ lệ quay lại ngày sau và lý do họ tự nói muốn quay lại; chưa đặt con số thành tích khi chưa có người chơi đo thực tế.

Trong tác vụ này chỉ thêm báo cáo rà soát; không thay đổi phần thưởng Alphatest, thông số cân bằng, quy tắc PK hay triển khai server.
