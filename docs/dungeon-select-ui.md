# Giao diện Phó Bản

Giao diện chọn phó bản theo mẫu: viền vàng trên nền xanh đêm, ảnh cảnh riêng theo vùng, danh sách bên trái và thông tin bên phải.

## Hành vi

- Tám thẻ địa điểm: Cổ Viện Ngọc Ấn, năm vùng thử luyện theo cấp và hai phó bản liên kết nhiệm vụ trong nhóm Sư môn.
- Lọc theo Cốt truyện / Thử luyện / Sư môn và cấp đề nghị. Cấp chỉ là đề nghị, không thêm khóa cấp.
- Năm vùng thử luyện có bốn độ khó: Dễ, Thường, Khó, Địa Ngục. Đổi độ khó cập nhật đúng boss, HP, lực chiến đề nghị, số quái, thời gian, số lượt và thưởng từ dữ liệu game.
- Phần thưởng có ba mục: Vượt ải, Lần đầu, Có thể rơi. Tỉ lệ rơi hiện đúng dữ liệu; xem trước không phát vật phẩm hoặc trừ lượt.
- Thanh Dấu chân chinh phạt phản ánh số vùng đã vượt và tổng lần chiến thắng đã lưu.
- Chuẩn bị hành trang mở Túi đồ. Khai chiến gọi luồng vào phó bản hiện có, trừ một lượt thật; Rời phó bản trở về map trước đó.
- Giữ điều kiện cốt truyện, trạng thái hồi phục, bế quan, thiên kiếp và lượt hằng ngày. Phó bản đang chạy không mở thêm phiên khác.
- Chân dung boss dùng đúng sprite hiện tại; clip theo ô atlas để không lộ các quái ở ô bên cạnh.
- Nội dung có thể cuộn độc lập; thanh lượt và nút Khai chiến luôn nằm trong khung mobile.

## Kiểm tra

- 51 kiểm thử liên quan được xác minh, gồm năm kiểm thử giao diện mới.
- Kiểm tra thao tác chạm trên Chromium/WebGL, DPR 3 và 2,75; bố cục vừa 667×375, 390×844, 915×412 và desktop 1440×900.
- Khai chiến đã vào đúng phiên `tier_10_dia_nguc`, trừ đúng một lượt, ngăn mở phiên thứ hai và rời về đúng map cũ.
- Build production và lint thành công.

Ảnh xem trước: [PC](previews/dungeon-select-desktop.png), [mobile](previews/dungeon-select-mobile.png).

## Artwork

Tạo bằng built-in `image_gen`, theo skill `imagegen`. Asset dùng trong game: `public/assets/ui/dungeon-environments-v1.png`, PNG 1254×1254, lưới 2 cột × 4 hàng. Tám ô nền dùng lại cho thẻ địa điểm và banner chi tiết, chỉ tải khi mở Phó Bản.

Prompt đã dùng:

> Use case: stylized-concept. Asset type: production environment sprite atlas for an existing Vietnamese xianxia RPG dungeon-selection interface. Input image: latest attached dungeon UI is STYLE AND COMPOSITION REFERENCE ONLY, not an edit target. Generate a square 2048x2048 artwork sheet containing EXACTLY eight edge-to-edge landscape environment illustrations in a strict 2-column by 4-row grid, each tile 1024x512 (2:1). No gutters, no dividers, no text or labels, no frames or UI. Each scene is its own complete panoramic painting and fills exactly its rectangular tile. Read order top left to bottom right: 1 peaceful jade spirit-stone trial valley with pink cherry trees, flowing waterfalls and a small Chinese temple; 2 moonlit icy cavern with a distant blue temple gate and pale snow crystals; 3 volcanic canyon with lava river and red demonic shrine; 4 thunderstorm mountain temple with electric blue lightning, stone stairs and gold lamps; 5 haunted purple mist valley with a dark pagoda and luminous violet portal; 6 celestial golden gate above clouds, sunlit stairs and majestic white jade towers; 7 ancient frozen wolf den, glacial blue cave entrance and frosty pines; 8 fox-spirit fire valley with crimson moon, burning scarlet forest and orange temple roofs. Cohesive crisp high-detail 2.5D painted game art, dark navy and antique gold foundations, each environment distinct, silhouettes readable at thumbnail size. Keep bottom quarter of each scene quieter and dark for actual HTML labels. No characters, monsters, currency, lettering, typography, logos or watermarks.
