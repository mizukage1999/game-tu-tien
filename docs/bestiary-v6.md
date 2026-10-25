# Yêu thú V6

HUD đã được đưa về bố cục V5 theo yêu cầu: chat ở giữa phía dưới, cụm kỹ năng bên phải và menu tính năng cũ. Phần quái, boss, đồ rơi và ký hiệu quái trên bản đồ của V6 vẫn được giữ nguyên. Các ảnh HUD V6 bên dưới ghi lại bố cục trước khi khôi phục; bố cục hiện tại xem [presentation-v5.md](presentation-v5.md).

## Nội dung quái

Thêm 30 loại quái, chia năm nhóm. Mỗi loại có tên, cấp, HP, tấn công, phòng thủ, phạm vi truy đuổi, EXP, thời gian xuất hiện lại và bảng đồ rơi. Thỏ Linh/Linh Hạc trung lập đến khi bị đánh. Boss có vùng cảnh báo chiêu thức, triệu hồi trợ thủ và hồi lại sau ba phút.

| Loài | Cấp | Nơi xuất hiện mới |
| --- | ---: | --- |
| Thỏ Linh | 1 | Rừng Linh Thú |
| Heo Rừng | 3 | Rừng Linh Thú |
| Sói Hoang | 5 | Rừng Linh Thú |
| Yêu Lang Nhỏ | 7 | Linh Thú Lâm, Bí Cảnh Thạch Linh |
| Yêu Thạch | 9 | Bí Cảnh Thạch Linh, Huyền Nham Động |
| Côn Trùng Độc | 10 | Rừng Linh Thú, Linh Thú Lâm |
| Hồ Yêu | 12 | Linh Thú Lâm, Thanh Vân Cốc |
| Linh Hạc | 16 | Thác Ngọc Tuyền |
| Yêu Hổ Sơn Lâm | 20 | Linh Thú Lâm, Thanh Vân Cốc |
| Mộc Yêu | 23 | Thanh Vân Cốc, Huyền Nham Động |
| Thủy Yêu | 26 | Thác Ngọc Tuyền |
| Độc Xà | 29 | Huyền Nham Động, U Minh Trạch |
| Huyết Lang | 35 | U Minh Trạch |
| Hắc Hùng | 40 | U Minh Trạch |
| Yêu Linh Phong | 45 | Xích Hà Sơn, Tử Vân Phong |
| Hỏa Ma | 48 | Xích Hà Sơn |
| Băng Yêu | 52 | Lôi Âm Các, Hàn Băng Nguyên |
| Lôi Điểu | 58 | Lôi Âm Các |
| Thạch Cự Nhân | 65 | Hàn Băng Nguyên |
| Thiên Lang Vương | 70 | Tử Vân Phong |
| Hỏa Kỳ Lân | 78 | Viêm Dương Địa |
| Băng Phượng | 82 | Hàn Băng Nguyên |
| Lôi Ma Tướng | 90 | Thiên Kiếp Nhai |
| U Minh Ma | 98 | Tử Vân Phong |
| Cửu Vĩ Thiên Hồ | 101 | Hàn Băng Nguyên |
| Long Thần | 104 | Tử Vân Phong |
| Ma Tôn | 107 | Viêm Dương Địa |
| Thiên Đạo Kim Ô | 110 | Viêm Dương Địa |
| U Minh Cổ Thụ | 113 | Tử Vân Phong |
| Hỗn Độn Thú | 116 | Thiên Kiếp Nhai |

## Tương thích và vận hành

- Giữ ID quái cũ dùng trong nhiệm vụ và bản lưu. Quái cũ ở các vùng và các đợt phó bản dùng đồ họa mới tương ứng; không thay điều kiện nhiệm vụ.
- Quái mới được đặt trên các ô có đường đi từ điểm xuất hiện, cách điểm vào ít nhất tám ô, cách NPC, cổng và điểm tương tác ít nhất năm ô; giữ mật độ tối đa 16 con trong mỗi bản đồ có bổ sung.
- Khu dân cư và tông môn không nhận quái mới. Các linh thú luyện tập cũ tại góc sân Đại Thừa Viện vẫn còn.
- Cấp vùng vẫn là gợi ý. Boss 100+ nằm ở các vùng cao; tên hiển thị cấp, minimap/bản đồ dùng dấu vàng và mục dẫn đường riêng cho boss.
- Đồ rơi có Linh Khí, Linh Thạch, đan hồi phục, Yêu Đan, đá cường hóa và trang bị theo phẩm chất. Drop dạng gear được chuyển thành ID trang bị thật trước khi tạo vật phẩm trên đất.
- Thu phục các loại hồ, hổ, hạc và huyết lang mới tiếp tục cộng tiến độ linh thú tương ứng theo cơ chế chiến thắng hiện có.
- Sửa hồi quái để chỉ vẽ cơ thể đã cắt frame, giữ sprite vật lý ẩn. Xóa sprite hiển thị khi thực thể bị hủy và làm mờ cả thân khi rời phó bản.
- Nhãn máu/tên căn theo chiều cao từng loài. Texture chữ dùng resolution đúng ngay từ khởi tạo trên Canvas và WebGL.

## Đồ họa

Năm atlas RGBA mới có 4 cột × 6 hàng, tổng 120 tư thế: đứng, một bước di chuyển, ra đòn, bị hạ. Game dùng chu kỳ hoạt ảnh rút gọn; phản ứng trúng đòn kết hợp tư thế và nháy màu, hai phía trái/phải lật ngang. Đây chưa phải bộ frame vẽ riêng cho tám hướng như bảng sản xuất minh họa.

Các tư thế cùng loài giữ một tỉ lệ cơ thể và điểm neo chân. Bộ atlas nhỏ được đóng gói thành ô 224 px, nguồn lớn được giải phóng khỏi GPU. Nếu ảnh không tải được, dùng hình quái tạo sẵn để game tiếp tục chạy.

Ảnh tạo bằng image_gen tích hợp; đường dẫn và đầy đủ prompt tại [bestiary-v6-assets.json](bestiary-v6-assets.json).

## Kiểm tra

Kiểm thử dữ liệu xác nhận đủ 30 loài đều có vị trí đi được, bảng rơi đồ hợp lệ, bảo toàn mục tiêu nhiệm vụ và tính trung lập. Kiểm tra Chrome thật ở chế độ giả lập PC/mobile/iPhone: mở mục Linh Thú, đánh thường hạ Heo Rừng, nhận EXP và đồ rơi, hồi quái, chiêu vùng boss, ký hiệu boss trên bản đồ; có lượt Canvas và WebGL.

Kết quả: **203/203 kiểm thử, 34 tệp; build và lint thành công**.

Ảnh chụp: [HUD trong game](previews/bestiary-v6-ingame.png), [mobile](previews/bestiary-v6-mobile.png), [30 loài](previews/bestiary-v6-species.png), [cảnh báo chiêu boss](previews/bestiary-v6-boss.png), [bản đồ boss](previews/bestiary-v6-map.png).

