# Nhân vật và tỷ võ · V7

Màn chọn nhân vật dùng nền sơn môn buổi tối, tám thẻ chân dung, hình toàn thân, thông tin pháp môn và năm kỹ năng có thể xem trước. Người chơi đặt tên rồi vào Vương Gia Thôn. Chọn Vương Lâm hoặc Lý Mộ Uyển vẫn giữ phần tuổi thơ đã có.

| Nhân vật | Pháp môn | Sắc hiệu ứng |
| --- | --- | --- |
| Vương Lâm | Kiếm tu | Lam |
| Lý Mộ Uyển | Phù tu | Băng lam |
| Thẩm Nguyệt | Cung tu | Lục |
| Sở Thiên | Song đao | Đỏ |
| Hồng Liên | Hỏa tu | Đỏ cam |
| Vũ Minh | Ma tu | Tím |
| Quân Vô Trần | Thích tu | Vàng |
| Diệp Ly | Đao tu | Tím hoa |

Mỗi hệ có năm chiêu riêng. Ba chiêu mở từ Lv.1; hai chiêu tiếp theo mở ở Lv.8 và Lv.12. Người chơi chọn ba chiêu vào ô 2–4 ở mục Kỹ Năng. Đánh thường ở ô 1 và lướt có nút riêng: tổng cộng năm nút chiến đấu. Kỹ năng chung và tuyệt kỹ Vương Lâm trước đây vẫn được giữ cho nhân vật phù hợp. Dữ liệu cũ không có `heroId` tiếp tục dùng bộ chiêu đã lưu.

Tỷ võ vẫn điều khiển tay, có kéo sân/WASD, bốn nút đánh và một nút lướt. Sân mới có thanh HP/MP hai bên, đồng hồ, chân dung và sprite đúng hệ. Các tư thế gồm đứng, đi, chạy, đánh, thi triển và ngã. Mộc nhân luyện võ dùng diện mạo Sở Thiên để phân biệt đối thủ. Nút Trở về và đóng sân luôn có thể sử dụng.

Hiệu ứng của 40 chiêu lấy từ atlas RGBA riêng; hình tác động được diễn hoạt bằng thu phóng và độ trong suốt. Đây chưa phải bộ chuyển động nhiều khung độc lập cho từng chiêu. Vùng trúng đòn thẳng/tròn/quạt dùng chung phép tính trong thế giới và tỷ võ; hiệu ứng hồi phục, lá chắn và giữ chân có tác dụng thực tế. Cảnh giới, trang bị và HUD ngoài thế giới giữ cơ chế hiện tại.

## Tài nguyên

Tạo bằng skill `imagegen`, công cụ `image_gen.imagegen`, chế độ builtin. Prompt, chế độ nền và đường dẫn nằm trong [provenance.json](../public/assets/heroes-v7/provenance.json).

- [selection.png](../public/assets/heroes-v7/selection.png): nền chọn nhân vật, 1536 × 1024.
- [arena.png](../public/assets/heroes-v7/arena.png): sân tỷ võ, 1536 × 1024.
- [roster.png](../public/assets/heroes-v7/roster.png): tám hình toàn thân, lưới 4 × 2, RGBA.
- [poses.png](../public/assets/heroes-v7/poses.png): sáu tư thế × tám nhân vật, RGBA.
- [effects.png](../public/assets/heroes-v7/effects.png): năm chiêu × tám hệ, RGBA.

Sprite nhân vật và hiệu ứng được đóng atlas nhỏ trong lúc preload. Các texture nguồn lớn được giải phóng; icon kỹ năng dùng nền trong suốt và được cache. SVG giao diện có vùng cắt riêng để không lộ ô bên cạnh khi đổi tỉ lệ khung.

## Xem thử

- [Chọn nhân vật PC](previews/heroes-v7-selection-desktop.png)
- [Chọn nhân vật mobile](previews/heroes-v7-selection-mobile.png)
- [Kỹ năng mobile](previews/heroes-v7-skills-mobile.png)
- [Tỷ võ mobile](previews/heroes-v7-duel-mobile.png)
- [Tỷ võ iPhone xoay màn hình](previews/heroes-v7-duel-iphone.png)

## Kiểm tra

Kiểm thử dữ liệu xác nhận đủ tám hệ/40 chiêu, điều kiện mở khóa, thay chiêu, chặn chiêu thuộc hệ khác, lưu/tải nhân vật mới và tương thích dữ liệu cũ. Kiểm thử tỷ võ xác nhận sát thương sau thời gian chuẩn bị, giữ chân, hồi phục, lá chắn và kiểm tra dữ liệu truyền mạng. Kiểm thử giao diện xác nhận chọn hệ và tạo nhân vật đúng danh tính.

Script xem thử local: `.preview/roster-v7-qa.mjs`. Script kiểm tra chạm chọn tám nhân vật, vào Vương Gia Thôn, kỹ năng riêng, tải atlas, dùng chiêu và rời sân, kích thước 667 × 375 / 844 × 390 / iPhone xoay, cùng việc dùng chiêu lên quái thật cho cả tám hệ.
