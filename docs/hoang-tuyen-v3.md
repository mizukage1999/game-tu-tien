# Đạo Hóa Hoàng Tuyền — cổng U Minh màu lam

Thay hình xoáy tím bằng cổng đá mái ngói trồi lên, cửa sáng lam, nước Hoàng Tuyền tràn qua chân cổng, hồn ảnh và xích linh hồn. Có icon lam riêng, dùng chung trong HUD, thư viện, bộ chiêu và tỷ võ.

Atlas RGBA có 25 khung, bố trí 5 × 5, nguồn thực tế 1254 × 1254. Năm pha gồm: xuất hiện pháp ấn, dựng/mở cổng, tràn nước, vòng gây sát thương và rút nước/tan biến. `wangVisual` giữ nhịp 500ms, fade từ 4000 đến 4500ms. Cổng đứng thẳng và vẽ dưới lớp nhân vật; khung xem thử giữ trọn mái cổng.

Không đổi MP, hồi chiêu, tầm đánh, số lần gây sát thương, làm chậm, suy yếu, bộ chiêu hoặc dữ liệu lưu. Các chiêu khác và hai tuyệt kỹ mới ở lượt trước được giữ lại. Bản cũ vẫn nằm trong thư mục asset.

Hình được tạo và chỉnh khoảng cách bằng **built-in imagegen**. File nguồn, file trước khi chỉnh, prompt và prompt chỉnh được ghi tại [hoang-tuyen-v3-assets.json](hoang-tuyen-v3-assets.json). Hai asset dùng trong game:

- `public/assets/skills/wang-hoang-tuyen-v3.png`
- `public/assets/skills/wang-hoang-tuyen-icon-v3.png`

PNG có alpha thật. Khoảng trống giữa các hàng đã được chỉnh để tránh vệt nước của khung bên cạnh lọt vào khi cắt atlas. Bộ cắt dùng kích thước nguồn thực và căn trong ô, xử lý cả kích thước không chia hết cho 5. Runtime dùng ô 192 × 192 trong texture 960 × 960, khoảng 3,52 MiB RGBA; sprite dùng chung texture và được hủy khi hết hiệu ứng. Hai bản WebP có alpha tổng khoảng 1,3 MiB.

Kiểm chứng: 38 kiểm thử liên quan qua, gồm cắt khung, năm pha, tám đợt sát thương cũ, HUD, thao tác chọn chiêu, tỷ võ và đồng bộ map. Lint và build qua. Chrome cục bộ ở 1440 × 900, 844 × 390, 640 × 360: icon mới, khung xem thử, map, nút ra chiêu tỷ võ và hủy sprite sau khi tan biến. Hai phiên trình duyệt dùng relay giả lập xác nhận người đứng gần thấy cổng mới. Không thao tác dữ liệu người chơi hoặc deploy server thật.
