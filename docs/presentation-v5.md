# Giao diện và nhân vật V5

Áp dụng hai hình tham khảo vào game hiện tại: nền đêm xanh, điểm nhấn vàng, giao diện gọn và sprite nhân vật có chân neo cố định. Chữ, biểu tượng chỉ đường và nút bấm vẫn là thành phần giao diện thật.

## Đăng nhập và bắt đầu

- `EntryScreen` dùng chung nền cho đăng nhập, đăng ký, chọn nhân vật và tiếp tục bản lưu.
- Vương Lâm và Lý Mộ Uyển đều bắt đầu bằng nhân vật trẻ em ở Vương Gia Thôn như trước. Nhân vật trưởng thành dùng bộ sprite mới sau khi nhập môn.
- Người đã có bản lưu bấm **Tiếp tục** để vào đúng hành trình đang chơi. Không tạo lại nhân vật khi mở màn hình này.
- Bố cục theo chiều cao thực của vùng game, kể cả iPhone đang xoay giao diện bằng CSS. Biểu mẫu dài có thể cuộn.

## Trong game và bản đồ

- HUD gọn hơn: chân dung lấy từ chính atlas mới, hai thanh HP/MP mảnh, lực chiến, nhiệm vụ và chat nhỏ.
- Giữ bốn nút đánh gồm đánh thường, một nút lướt, ngự kiếm nhanh cạnh Auto. Các tính năng còn lại mở trong **Thêm** trên cả PC và mobile.
- Minimap chữ nhật hiển thị ảnh địa hình hiện tại, vị trí, NPC, quái và cổng; chạm để mở bản đồ khu vực/thế giới.
- Sơn Hà Đồ dùng tranh thế giới V4, nhãn địa danh thật và la bàn. Chọn nơi đến rồi bấm **Dẫn đường** vẫn dùng cổng và cơ chế di chuyển hiện có.

## Nhân vật

- Hai sheet RGBA 8 cột × 4 hàng: đứng yên, hai bước di chuyển và tư thế ra đòn cho tám hướng.
- Một sheet bổ sung có tư thế thi pháp, trúng đòn, ngã và tọa thiền cho cả hai nhân vật.
- Atlas game đóng gói thành ô 160 px, chân tại y=150; nhân vật đứng cao khoảng 108 px. Cùng một tỉ lệ cơ thể cho các bước chân; tư thế ngồi/ngã không bị kéo cao bằng tư thế đứng.
- Đã căn riêng ranh giới các hàng và vùng nằm ngang của tư thế ngã để giữ nguyên tóc, tay và giày. Nền alpha được giữ nguyên; không ghép lớp vũ khí cầm tay.
- Đây là bộ hoạt ảnh rút gọn: chu kỳ bước chân dùng các tư thế đã vẽ, ba đòn liên hoàn dùng chung tư thế ra đòn với nhịp riêng. Không phải toàn bộ số frame của bảng minh họa. Hiệu ứng kỹ năng và sát thương vẫn do hệ thống chiến đấu hiện tại xử lý.
- Hướng nhìn 8 chiều chỉ điều khiển hình vẽ; tìm đường, va chạm và điều kiện chiến đấu vẫn ở không gian bản đồ. Hit-frame chỉ gây sát thương một lần, có dự phòng nếu thiết bị bỏ qua frame.
- Sau khi đóng gói atlas nhỏ, giải phóng ba texture nguồn lớn khỏi GPU.

## Tài nguyên và kiểm tra

Nguồn ảnh mới được tạo bằng công cụ image_gen tích hợp. Đường dẫn và toàn bộ prompt nằm trong [presentation-v5-assets.json](presentation-v5-assets.json). Đồ họa bản đồ tiếp tục dùng bộ [world-v4-assets.json](world-v4-assets.json).

Các kiểm tra tự động bao gồm hướng di chuyển qua phép chiếu isometric, thời điểm gây sát thương, khóa/mở hoạt ảnh và menu thu gọn. Kiểm tra Chrome thực tế trên PC 1440×900, mobile 844×390 và iPhone 390×844: chọn nhân vật, tiếp tục dữ liệu, năm nút chiến đấu, minimap/bản đồ và các tư thế. Đã chạy cả Canvas và WebGL; kiểm tra lại toàn bộ nhiệm vụ mở đầu ở Vương Gia Thôn.

Kết quả cuối: **199/199 kiểm thử, 33 tệp; lint và build thành công**. Mười nhiệm vụ mở đầu đều có thể tự dẫn đường và hoàn thành đến bước nhập môn.

Ảnh chụp trực tiếp trong game: [Màn hình bắt đầu](previews/presentation-v5-login.png), [HUD mobile](previews/presentation-v5-mobile.png), [Sơn Hà Đồ](previews/presentation-v5-world.png), [bản đồ khu vực](previews/presentation-v5-local.png), [Lý Mộ Uyển](previews/presentation-v5-hero-female.png).
