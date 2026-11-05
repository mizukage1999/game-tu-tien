# HUD và độ trễ mở menu — 05/11/2026

## Nguyên nhân đã xác nhận

- **Texture cảnh giới bị tải lên GPU hai lần.** Phaser đã tạo texture khi tải ảnh; `addSpriteSheet` sau đó lại tạo texture mới từ cùng ảnh. Tác vụ nền khi nhân vật nhập môn/lên cấp có thể trùng lúc bấm menu. CPU profile bằng Chrome WebGL SwiftShader ghi nhận riêng lần upload thứ hai chiếm 5.379 giây mẫu CPU. Đây là tác vụ `load`, không phải thời gian React xử lý click.
- Atlas cảnh giới cũ 1536×1024 tương đương 6 MiB RGBA mỗi texture. Nay dùng atlas 768×512, mỗi ô 256×128, khoảng 1.5 MiB; thêm tọa độ frame trên texture có sẵn thay vì upload lần nữa. Vẫn đủ 12 cảnh giới, giữ kích thước hiển thị 120×60.
- Khi menu che game, trình duyệt vẫn có thể ghép lớp canvas và các panel HUD phía sau dù Phaser đã bỏ lượt vẽ. Nay ẩn các lớp bị che khỏi compositor, bỏ blur của cửa sổ menu. Mô phỏng, timer và đồng bộ vẫn chạy; đóng menu khôi phục bản đồ.
- Minimap nhận object/array mới và store hồi phục nhân vật ngay cả khi dữ liệu không đổi. Nay chỉ phát cập nhật khi có thay đổi thực.
- Lần mở Săn Boss đầu tiên dựng catalog bằng cách duyệt và tạo toàn bộ bản đồ ngay trong render. Đã chuyển sang loader chia theo từng bản đồ, dùng chung kết quả đang tải và cache kết quả hoàn tất. Cửa sổ hiện trạng thái chuẩn bị trước, vẫn đóng được; mở lại không dựng catalog lại.
- Khung SVG HUD bị luật CSS `.quest-panel > *` chuyển sang `position: relative`, tạo một vùng trống lớn trên tab nhiệm vụ. Đã tăng độ ưu tiên của luật khung trang trí để giữ nó nằm phủ trên panel.

## Giao diện

- HUD PC rộng 228–260 px theo viewport, giảm từ 308 px. Avatar, HP/MP, nhiệm vụ, hướng dẫn và danh sách tổ đội có kích thước tương ứng; không dùng scale làm nhòe chữ.
- HUD dùng chung font hệ thống Segoe UI/Tahoma/Noto Sans, không trộn các font serif và chữ nghiêng.
- Chuột mở menu ngay khi nhấn; touch vẫn chờ thao tác chạm hoàn tất để không mở nhầm khi cuộn. Bàn phím vẫn hoạt động.
- Hoạt Động chỉ còn Thiên Giáng Dị Bảo và Động Phủ Viễn Cổ. Không xóa dữ liệu lịch sử/bảng SQL của đua ngự kiếm.
- Icon phần thưởng hoạt động dùng ảnh đã cắt sẵn, không lặp SVG tham chiếu toàn atlas túi đồ.

## Dọn asset

Đã kiểm tra `schoolSheet`: mọi phái ngoài Vương Lâm dùng bộ V2. Xóa 7 PNG V1 không còn dùng và 7 bản WebP tương ứng, tổng **26,681,399 byte (~25.45 MiB)**. Giữ V1 Vương Lâm và ảnh nguồn còn được builder sử dụng. Danh sách, dung lượng và SHA-256 nằm trong `asset-cleanup.json`. Manifest giao ảnh và báo cáo kiểm chứng đã được cập nhật.

Việc xóa asset cũ giảm dung lượng kho/deploy; không xem đây là bằng chứng FPS tăng.

## Kiểm chứng và giới hạn

- TypeScript, kiểm thử hành vi menu, hoạt động, minimap, hồi phục, tu luyện, kỹ năng, nhiệm vụ và texture cảnh giới.
- Kiểm chứng manifest: 102 ảnh giao tải, 45 icon UI, 87 icon kỹ năng menu và 57 asset khởi động.
- Chrome bản dev dùng React development và module ứng dụng do Vite phục vụ; dependency đã prebundle, backend offline. Có kiểm tra chuột thật qua CDP, nhiều kích thước PC, touch mobile mô phỏng, font, vị trí panel, tổ đội, ẩn/hiện bản đồ và timer sau menu.
- Không phát sinh lượt tải script mới sau lần bấm menu ở bản dev; các module menu đã được import cùng HUD. Không quy toàn bộ hiện tượng khựng cho Vite.
- CPU profile sau sửa không còn upload lặp; mẫu `texImage2D` giảm xuống khoảng 34 ms trong cùng bài thử. Kiểm tra runtime riêng xác nhận đúng một upload texture cảnh giới. Số đo dùng GPU phần mềm, không đại diện cho GPU thật.
- Lượt kiểm tra Săn Boss sau khi chia việc chuẩn bị dữ liệu: từ sự kiện nhấn chuột đến DOM cửa sổ khoảng 4 ms, hai lượt RAF khoảng 237 ms trong môi trường mô phỏng. Danh sách boss thật hoàn tất sau đó và cửa sổ đóng/mở bình thường; đây không phải cam kết độ trễ trên máy người chơi.
- Thời gian tạo DOM, hai lượt `requestAnimationFrame` và pixel thực sự xuất hiện là các số đo khác nhau. Bài thử GPU phần mềm vẫn có dao động lớn ở layout/raster/GC; không cam kết mọi máy đạt 60 FPS hoặc mọi menu hiện trong một ngưỡng cố định. Chưa đo trực tiếp Redmi Note 11/iPhone.
