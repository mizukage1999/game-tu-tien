# Sprite và kỹ năng 8 phái

> HUD hiện tại đã nâng lên sáu ô chiêu, đánh thường và lướt riêng: [hướng dẫn bản mới](hud-sessions-v1.md). Phần dưới ghi lại thời điểm ra mắt bộ sprite.

Mỗi phái có 10 chiêu riêng, tổng cộng 80 chiêu: giữ mã 1–5 và thêm mã 6–10. Nhân vật cũ giữ được bộ chiêu đã chọn. Năm chiêu mới mở ở cấp 16, 20, 25, 30, 40; không tự gắn vào thanh chiến đấu.

Vào **Kỹ Năng**, chọn chiêu, chọn ô 2–4 rồi bấm **Dùng ở ô…**. Ngoài HUD vẫn có đánh thường, ba ô chiêu tùy chọn và một nút lướt. Màn tạo nhân vật xem được cả 10 chiêu trong hai hàng icon.

| Phái | Chiêu bổ sung |
| --- | --- |
| Kiếm tu | Lưu Quang, Nhất Kiếm, Bách Xuyên, Vạn Kiếm, Kiếm Thần |
| Phù tu | Hộ Thân Băng Giáp, Tẩy Uế, Phục Sinh Băng Liên, Thiên Giới, Thần Phù |
| Cung tu | Đằng La, Bách Thảo, Linh Thú Tiễn, Thiên La, Mộc Thần |
| Song đao | Cuồng Sát, Huyết Ảnh, Loạn Vũ, Tử Sát, Sát Thần |
| Hỏa tu | Hỏa Long, Phượng Hoàng, Diễm Ngục, Tịnh Hỏa, Hỏa Thần |
| Ma tu | Hồn Tức, Vong Hồn, Ma Liên Hoa, Tà Linh Chú, Diệt Thế |
| Thích tu | Bát Nhã, La Hán, Phật Ấn, Kim Thân, Phật Thần |
| Đao tu | Ảo Cảnh, Phân Thân, Hoa Tán, Tịnh Mộng, Ảo Thần |

Các chiêu có vùng đánh thẳng/quạt/tròn, góc và tầm khác nhau, thời gian chuẩn bị, MP và hồi chiêu riêng. Chiêu hỗ trợ có tỷ lệ hồi máu hoặc lá chắn riêng; khống chế giữ chân có tác dụng trong thế giới và tỷ võ. Bóng linh thú, phân thân và pháp tướng là hiệu ứng một lần của chiêu; không tạo pet hay thực thể AI kéo dài. Phục Sinh Băng Liên hồi máu lúc còn sống, không thay cơ chế về tông môn khi tử trận.

## Asset và hiển thị

- Tám atlas RGBA tại [public/assets/skills-schools-v1](../public/assets/skills-schools-v1), mỗi ảnh 1024×1536, lưới 5 cột × 8 hàng.
- Mỗi chiêu có 4 khung vẽ: tụ lực, xuất chiêu, va chạm, tan biến. Tổng 320 khung, gồm cả hình mới cho 40 chiêu cũ.
- Cột 0–4 là chiêu 1–5 ở hàng 0–3 và chiêu 6–10 ở hàng 4–7. Icon lấy khung va chạm; có alpha, được cắt tròn trên HUD.
- Dùng công cụ **built-in image_gen**, chế độ tạo ảnh mới, nền trong suốt. Toàn bộ prompt cuối, đường dẫn và bố cục nằm trong [generation.json](../public/assets/skills-schools-v1/generation.json). Không dùng CLI/API fallback.
- `heroSpellArt.ts` là nguồn tọa độ và thời điểm chuyển khung dùng chung giữa Phaser, xem thử và tỷ võ. Khung va chạm bắt đầu đúng lúc tính sát thương. Hiệu ứng bay xoay theo hướng đánh; effect được hủy sau khi hoàn tất.
- Thế giới offline, SharedWorld và ArenaEngine dùng cùng cấu hình hồi phục/lá chắn/giữ chân. Peer từ chối chiêu của phái khác hoặc chưa đủ cấp. Giao thức mạng hiện tại nhận được các mã 6–10, không cần thay schema server.
- Màn xem thử giữ tỷ lệ hình gốc; tỷ võ chiếu sprite vào vùng đánh, tránh SVG thu nhỏ chiêu thẳng thành một hình vuông bé.

## Kiểm tra

- Toàn bộ **300 tests / 47 files** qua; build và lint qua. Các kiểm tra bổ sung gồm toàn bộ 40 chiêu mới trong PK tay, MP, thời điểm tác động, khống chế, hồi/lá chắn, lưu/tải mã chiêu 10, chặn cấp chưa mở, thay chiêu qua nút thật và giới hạn 5 nút HUD.
- Kiểm tra ảnh đọc alpha: đủ 320 ô có nét vẽ; PNG giữ kênh trong suốt. Hai góc ảnh có alpha 1/255, những ảnh còn lại 0/255; không có nền đen đặc trong ô icon.
- Chrome hai phiên với relay Realtime cục bộ: cả 8 phái tải đủ 40 khung/phái; người đứng gần thấy đúng khung va chạm của chiêu mới, hiệu ứng được giải phóng; tỷ võ hiển thị Hỏa Long và không vẽ vòng tầm đánh. Hai phiên không có lỗi JavaScript chưa xử lý.
- Xem màn hình 844×390, 667×375 và PC 1440×900; thử chạm, cuộn tới chiêu 10, nút xem chiêu và nút vào game. Chưa chạy kiểm tra này trên Supabase production hoặc iPhone vật lý.

Ảnh chụp: [mobile](previews/school-skills-mobile-667.png), [PC](previews/school-skills-desktop.png), [tỷ võ](previews/school-skills-duel-mobile.png), [chọn nhân vật](previews/school-skills-roster-mobile.png).
