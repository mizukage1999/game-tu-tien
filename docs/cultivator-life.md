# Đời tu tiên và đồ họa bổ sung

Hai nhân vật bắt đầu tại Vương Gia Thôn: Thiết Trụ (Vương Lâm) hoặc Mộ Uyển (Lý Mộ Uyển). Lời thoại và nhật ký thay tên theo lựa chọn. Sau chương mở đầu có đoạn chuyển thời gian đến tuổi trưởng thành.

## Cấp, EXP và thời gian game

- 30 giây chơi = 1 ngày game; 360 ngày = 1 năm. Đóng game sẽ dừng đồng hồ.
- Không hiển thị tuổi hay thọ nguyên. Đồng hồ chỉ dùng cho linh điền, bế quan và nhiệm vụ ngày.
- Nhân vật dùng cấp độ và EXP; cần nhiều EXP hơn trước. Cảnh giới vẫn có bình cảnh và thiên kiếp.
- Chi tiết hệ thống chiến đấu mới: [combat-rework.md](combat-rework.md).

## Chơi thử các tính năng

- Hoàn thành **Lò Đan Khai Hỏa** để nhận động phủ. Vào **Tiên Lộ → Động Phủ → Về động phủ**.
- Linh điền: chọn linh thảo, gieo hạt, chờ 2–4 ngày game, thu hoạch. Mỗi vụ hoàn lại hạt. Nâng điền để thêm luống và tăng sản lượng.
- Tĩnh thất: bế quan 1, 3 hoặc 10 ngày game. Chờ đủ thời gian rồi xuất quan để nhận EXP một lần. Có thể hủy sớm; hủy không nhận EXP. Nâng tĩnh thất và tụ linh trận để tăng hiệu suất.
- Đan phòng: có lò cơ bản khi nhận động phủ; nâng lò, học công thức, chế tạo. Vật tư mua tại Tiền Đa Bảo; Huyền Thiết và công thức còn có thể rơi từ quái/thủ lĩnh.
- Pháp bảo: chế Ngọc Hộ Thân, vận dụng ở mục Pháp bảo để tăng sinh lực/phòng ngự.
- Ngự hành: Thanh Vân Kiếm tăng tốc 45%, Bạch Vân Hạc tăng 70%; mở theo nhiệm vụ tương ứng.
- Linh thú: sáu loài, chỉ số riêng. Đánh bại loài tương ứng để tích lũy dấu ấn thu phục; Yêu Đan không mua được linh thú. Nuôi bằng Linh Thú Đan, tiến hóa bằng nguyên liệu và chọn một loài đồng hành. Mỗi loài có kỹ năng hỗ trợ riêng.
- Tán tu: xuất hiện ngẫu nhiên ở vùng có quái, có tên và tấn công khi người chơi tới gần. Sức mạnh dùng nội bộ, không hiện trên nhãn. Không xuất hiện trong làng, thành, tông môn, động phủ hoặc phó bản.
- Trang bị: đủ sáu ô vũ khí, y phục, đầu, giày, nhẫn, ngọc bội; cường hóa xác suất bằng Đá Cường Hóa, tối đa +12. Vũ khí cầm tay được ẩn; vật phẩm và chỉ số trang bị vẫn giữ nguyên khi tải save.

## Tài nguyên hình ảnh

Ba atlas raster mới được tạo bằng công cụ **image_gen tích hợp**, giữ alpha và lưu trong dự án:

| Tệp | Đặc tả/prompt thiết kế |
| --- | --- |
| `public/assets/maps/mu-uyen-child.png` | Painted xianxia game sprite sheet, young Li Mu Wan as a child, ivory and muted jade green rural hanfu, long dark hair. Four idle frames in the top row, four walking frames in the bottom row, consistent side view and scale, full body, equal 4×2 cells, transparent background, no text, no weapon or aura. |
| `public/assets/maps/wanderers.png` | Six distinct named-role wandering cultivator character designs for a painted xianxia RPG, full bodies in a regular 3×2 atlas: traveling swordsman, elderly herbalist, female staff bearer, scholar, hunter, old sage. Match the village NPC treatment; transparent background, isolated figures, no text or UI. |
| `public/assets/maps/spirit-companions.png` | Six small spirit beast companions for a painted xianxia RPG, regular 3×2 atlas: snow fox, golden tiger cub, white crane, jade deer, silver shadow wolf, russet three-tailed fox. Consistent three-quarter side view and lighting, full bodies and tails, transparent background, no text or UI. |

`expansionArt.ts` cắt atlas, chuẩn hóa kích thước và đăng ký texture/animation. Bộ nhân vật nữ có trạng thái đứng/đi; tán tu và linh thú dùng hình vẽ riêng với di chuyển theo đường, chưa có bộ animation chiến đấu riêng.

## Kiểm tra

`npm test` kiểm tra logic và tương thích save; `npm run build` kiểm tra TypeScript và bản đóng gói. Kiểm tra trình duyệt bổ sung dùng Chrome với kích thước mobile và PC, gồm đường đi nhiệm vụ thứ hai, trồng/thu hoạch, bế quan, chế tạo, trang bị, tán tu, linh thú, ngự hành và tải lại save.
