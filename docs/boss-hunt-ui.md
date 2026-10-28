# Săn Boss

Mở từ **Thêm → Săn Boss**. Giao diện xanh đêm/vàng theo mẫu, có danh sách mục tiêu, bản đồ khu vực, ảnh boss, tab Thông tin/Sát thương/Thưởng và nút điều hướng.

## Hoạt động hiện tại

- **Thế giới:** lấy boss và tọa độ sinh thật từ các map công khai. **Tinh anh:** lấy các loài tinh anh đang có trong map. Tìm kiếm theo tên hoặc khu vực, hỗ trợ không dấu.
- **Cá nhân:** lấy boss từ danh mục phó bản hiện có; chọn độ khó và khiêu chiến qua luồng vào phó bản của game. Kiểm tra lượt trong ngày và điều kiện hiện có trước khi cho vào.
- **Đến ngay:** ở cùng map thì tìm đường đến điểm sinh; khác map thì đi theo tuyến cổng hiện có. Không thay đổi điều kiện mở map và không tự cấp thưởng.
- Sinh lực, trạng thái giao chiến và thời gian hồi sinh lấy từ quái đang được quan sát trong map hiện tại. Ngoài map hiển thị **Chưa dò khu vực**. Không hiển thị đồng hồ toàn server khi chưa có dữ liệu.
- Thưởng hiển thị EXP, vật phẩm rơi, tỉ lệ thật trong bảng loot và các lượt rơi bổ sung của luồng hạ quái; boss phó bản còn có phần thưởng hoàn thành riêng. Tỉ lệ là theo từng lượt rơi, không cộng các lượt độc lập thành một tỉ lệ giả.
- **Sát thương** hiện theo dõi HP đã mất/HP còn lại. Chưa có bảng xếp hạng sát thương theo người chơi trên server.
- **Tông môn/Sự kiện** có trạng thái trống; chưa tạo lịch boss, lệnh săn hoặc phần thưởng mới cho các mục này.
- Danh sách/nội dung cuộn riêng; nút hành động giữ trong khung. Mobile có nút **Bản đồ** để chuyển giữa bản đồ và chi tiết. Khi nhiều địa điểm, danh sách ghim dùng lưới cuộn để tránh chồng lên nhau.
- Ảnh mới chỉ được yêu cầu khi mở Săn Boss; không thêm ảnh vào bước tải game. Snapshot theo dõi quái chỉ cập nhật khi menu này mở. Không đổi giao thức multiplayer hoặc dữ liệu lưu nhân vật.

## Ảnh kiểm tra

- [PC: bản đồ và thông tin boss](previews/boss-hunt-desktop-world.png)
- [Mobile: thông tin boss](previews/boss-hunt-mobile-info.png)
- [Mobile: thưởng](previews/boss-hunt-mobile-rewards.png)
- [Mobile: chọn độ khó boss phó bản](previews/boss-hunt-mobile-personal.png)

## Asset và prompt

Tạo bằng **công cụ imagegen tích hợp**; không dùng CLI/API. Chữ, nút, danh sách, HP và bộ đếm là UI tương tác. Icon vật phẩm/chân dung nhỏ dùng sprite game hiện có.

- [public/assets/ui/boss-hunt-scenes-v1.png](../public/assets/ui/boss-hunt-scenes-v1.png): PNG 2048 × 768, lưới 2 cột × 3 hàng, mỗi ô 1024 × 256. Kích thước này là đầu ra thực tế của công cụ. Dùng cảnh theo loài tương ứng; loài chưa có cảnh riêng dùng nền yên tĩnh và chân dung sprite thật.
- [public/assets/ui/boss-hunt-world-v1.png](../public/assets/ui/boss-hunt-world-v1.png): PNG 1024 × 1536, bản đồ minh họa khu vực. Ghim lấy tên/map thật; đây là sơ đồ chọn mục tiêu, không thay thế tọa độ địa hình gameplay.

Prompt atlas cuối:

```text
Use case: stylized-concept. Create a production environment atlas for the Boss Hunt (Săn Boss) interactive menu of a Vietnamese xianxia RPG, matching the attached reference's dark navy and antique gold fantasy atmosphere. Exactly six full-bleed rectangular painted scenes arranged in a perfectly regular 2-column by 3-row grid, overall 2048x1536 pixels, each cell 1024x512. No gaps, no borders, no text, no letters, no numbers, no logos, no UI. Top-left cell: a sweeping isometric fantasy continent with five distinct regions: blue glacial mountains at upper left, red volcanic fortress at upper right, lush jade forest at center left, purple haunted mountain at lower left, golden lightning summit at lower right, connected paths and mist, quiet spaces for live map pins. Top-right cell: a fearsome red-black winged dragon demon looming over a volcanic courtyard with lava fissures and small distant white-robed cultivators, boss dominant on right half, cinematic wide composition. Middle-left cell: a magnificent nine-tailed white spirit fox surrounded by icy blue mountain ruins and pale pink magic, crisp silhouette on right half, moonlit ice. Middle-right cell: an enormous ancient possessed tree with emerald spirit light in a deep lush forest temple, twisted roots and small distant adventurers, subject on right half. Bottom-left cell: a glorious golden three-legged sun crow / phoenix amid lightning above a floating stone temple, blue and gold storm clouds, subject on right half. Bottom-right cell: a powerful horned chaos beast, obsidian armor and purple spirit flames, purple ruined mountain palace, subject on right half. Consistent crisp high-detail 2.5D hand-painted game art, intricate Chinese fantasy architecture, readable silhouettes, atmospheric depth, warm gold accents, art detail suitable for Retina mobile. In every encounter cell keep the leftmost quarter a little quieter/darker for live title overlays. Artwork only; interface, names, stats, rewards and controls will all be live HTML.
```

Prompt bản đồ cuối:

```text
Use case: stylized-concept. Production artwork for an interactive Vietnamese xianxia RPG Boss Hunt regional map. ONE single full-bleed VERTICAL PORTRAIT fantasy continent map, 1024 pixels wide by 1536 pixels high, aspect ratio 2:3. Not a sprite grid, not a collage. Dark blue and antique gold 2.5D hand-painted game aesthetic matching the attached Boss Hunt reference. Top left around x25%, y24%: a vast blue glacial plateau with an icy Chinese palace, icy mountains and waterfalls. Top right around x78%, y26%: red volcanic fortress, glowing lava, black mountain spires. Center around x46%, y50%: a lush emerald forest with a ruined spirit temple and large ancient trees. Lower left around x25%, y77%: an eerie purple haunted mountain palace surrounded by mist. Lower right around x79%, y78%: a bright golden lightning summit with a floating stone temple. These regions are organically connected by winding stone paths, rivers, bridges and valleys; layered cliffs, clouds and waterfalls, readable isometric landmarks and cohesive perspective. Keep uppermost 12% and bottommost 5% somewhat dark and quiet for live interface title/legend overlays. Crisp rich detail, no stretched geometry, beautiful silhouettes suitable for sharp Retina mobile. NO text, NO lettering, NO numbers, NO symbols, NO pins, NO borders, NO interface, NO logos. We will overlay real interactive location pins in code.
```

## Kiểm tra

- 32 tests / 7 files đạt: menu Săn Boss, catalog/tọa độ thực, tìm đường, lọc tìm kiếm, snapshot HP/hồi sinh, trạng thái trống, độ khó/lượt phó bản; hồi quy SharedWorld, bestiary, kỹ năng boss và boot game.
- ESLint trên các file TypeScript thay đổi đạt.
- Chrome với backend QA riêng: HP giao chiến, hạ boss thật chuyển sang bộ đếm hồi sinh; vào đúng phó bản tier_90_kho qua nút Khiêu chiến; không có lỗi JavaScript chưa xử lý.
- Khung PC 1440 × 900; mobile 844 × 390, 667 × 375, 915 × 412; 390 × 844 qua chế độ xoay ngang của game. Đây là mô phỏng trình duyệt, chưa phải kiểm tra trực tiếp trên điện thoại.
- Xác nhận không có yêu cầu tải ảnh boss-hunt trước khi mở menu.
- TypeScript/Vite production build và kiểm tra runtime asset đạt.

