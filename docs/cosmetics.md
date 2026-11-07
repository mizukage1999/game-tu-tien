# Ngoại trang và shop Tiên Ngọc

Ngày: 2026-11-06. Ngoại trang chỉ thay diện mạo; không cộng chỉ số.

## Kết quả kiểm tra và thay đổi

Trước thay đổi này, `equipment` quyết định chỉ số chiến đấu. Các mẫu ngoại trang trong shop là hình xem trước, chưa được dùng để vẽ nhân vật trong thế giới.

Đã thêm:

- Nhân Vật → **Ngoại trang**, hoặc Tiên Ngọc → **Ngoại Trang**.
- 7 phối màu áo, 3 kiếm ảnh; xem thử, xoay 8 hướng, mặc/tháo từng phần.
- **Thử trong map · 30 giây**: chỉ trên máy đang thử, không ghi save, không đưa diện mạo thử vào gói online. Hết giờ hoặc bấm kết thúc sẽ trở về bộ đang mặc.
- Mặc bộ đã sở hữu: lưu `player.cosmetics`, giữ nguyên `equipment`, inventory và chỉ số. Thiếu vật phẩm sở hữu thì không dùng diện mạo đó.
- Áo đổi màu trên các hướng đứng/chạy/ra chiêu của cả 8 nhân vật trưởng thành. Giữ scale thế giới `0.94`, chân, khung hình và vùng va chạm.
- Kiếm ảnh đi theo hướng nhân vật; khi cưỡi kiếm sẽ đổi hình phi kiếm. Không thay đổi kỹ năng hay sát thương.
- Ba skin kiếm hiện tại chỉ dành cho Kiếm Tu. Phái khác giữ vũ khí đặc trưng; giao diện thử/mặc, nhân vật local/remote và thông tin đối phương đều loại skin không tương thích. Vật phẩm đã sở hữu vẫn được giữ trong túi.
- Vũ khí mua từ NPC được đổi sang mã trang bị cùng phẩm chất/chỉ số của phái đang chơi: kiếm, linh phù, cung, song đao, hỏa ấn, hồn phiên, thiền trượng hoặc ngọc giản. Icon trong túi/cửa hàng hiển thị đúng loại. Chưa có skin mới cho các vũ khí ngoài kiếm.
- Người chơi từ xa nhận diện mạo đang mặc qua presence/world pose. Thông tin đối phương và bảng xếp hạng nhận cùng dữ liệu public.
- Shop được sắp lại: nhóm bên trái, banner, tìm kiếm, lưới sản phẩm và xem chi tiết bên phải. Nút xem/thử dẫn sang đúng bộ được chọn.

**Giới hạn mỹ thuật:** đây là phối màu trên dáng áo có sẵn của từng phái, chưa phải bộ áo mới với dáng và chuyển động khác hoàn toàn. Với Vương Lâm, phần kiếm vẽ liền được ẩn khỏi bản sao texture khi dùng skin; cùng một mặt nạ dùng cho thế giới, người chơi từ xa và màn thử 8 hướng. Chỉ hiện lớp kiếm mới khi bản sao đã sẵn sàng, và khôi phục texture gốc khi tháo/kết thúc thử. Không sửa ảnh gốc hoặc chỉ số chiến đấu. Vũ khí đặc trưng cung/trượng/song đao của các phái khác vẫn thuộc hình gốc. Ngoại trang chưa áp dụng cho trẻ em trước nhập môn.

Các mẫu ngoại trang **chưa mở bán**. Không trừ Tiên Ngọc và không tự cấp bộ chưa sở hữu. Giao dịch pháp bảo 200 Tiên Ngọc có sẵn vẫn đi qua RPC hiện hành.

## Triển khai server

Không có thay đổi trực tiếp lên database thật trong lần này.

Với server đã cài leaderboard/admin:

1. Chạy `supabase/admin-catalog.sql` sau hệ thống `admin-operations.sql` hiện có để admin thấy các mã mới.
2. Chạy `supabase/appearance-profiles.sql` sau `leaderboard.sql` hiện có để cập nhật dữ liệu diện mạo của bảng xếp hạng, kể cả người offline.

Migration thứ hai không sửa save riêng, số dư, timestamp hay quyền tài khoản; có thể chạy lại. Server mới dùng `leaderboard.sql` và `admin-catalog.sql` được tạo lại cùng phiên bản này. `competition-upgrade.sql` cũng đã đồng bộ projector mới.

Admin có thể cấp qua luồng **thư vật phẩm** sẵn có, mỗi mã số lượng 1. Người chơi nhận thư rồi mở Ngoại Trang để mặc:

| Nhóm | Mã |
|---|---|
| Thời trang | `ao_thanh_van`, `ao_huyet_nguyet`, `ao_cuu_huyen`, `ao_long_uy`, `ao_lien_hoa`, `ao_van_hai`, `ao_tuyet_vu` |
| Kiếm ảnh | `kiem_anh_thanh_van`, `kiem_anh_huyet_nguyet`, `kiem_anh_cuu_huyen` |

## Tài nguyên và hiệu năng

Hai bitmap mới có alpha thật, tổng khoảng 57 KB, tải khi dùng:

- `public/assets/ui/cosmetic-robe-v1.webp`: 192×288, 29.006 byte.
- `public/assets/ui/cosmetic-weapons-v1.webp`: 384×256, 27.796 byte, ba ô 128×256.

Không thêm bộ thư viện ngoại trang vào loading làng. Biến thể màu chỉ tạo khi cần; xử lý 4 ô rồi nhường frame. Các nhân vật mặc cùng bộ dùng chung texture. Cache giữ tối đa hai sheet không còn được dùng; sheet đang dùng được giữ tới khi actor giải phóng. Chờ chiêu đang đánh hoàn tất trước khi đổi controller để giữ callback trúng đích.

## Kiểm tra

- Unit: ownership/slot hợp lệ, mặc/tháo/save, không đổi chỉ số, thử 30 giây, parser online và đổi màu giữ alpha.
- Trình duyệt với bản production cô lập: màu đổi thật, scale không đổi, callback đánh không mất, remote actor nhận đúng bộ, các hướng và khung hành động của 8 phái, cache giải phóng đúng, màn PC và mobile ngang 844×390 / 740×360.
- Đây là kiểm tra renderer/gói dữ liệu bằng peer giả lập, chưa phải thử hai tài khoản qua Supabase thật hoặc đo trên điện thoại vật lý.
- PGlite: projector nhận bộ đã sở hữu, loại bộ không sở hữu/sai slot, không cộng stats, migration cập nhật người offline và không sửa save.

## Nguồn hình và prompt

Tạo bằng skill `imagegen`, công cụ tạo ảnh tích hợp. Chỉ xuất WebP nhỏ để dùng trong game; bản sinh gốc nằm ngoài repo trong thư mục generated_images của Codex.

Prompt kiếm:

```text
Use case: stylized-concept. Asset type: production transparent game weapon sprite atlas, exactly THREE equal vertical columns, one sword per column, all tips up, same vertical alignment and identical hilt position at 80% height. Overall landscape 3:2 aspect ratio, each individual cell 1:2 ratio. Three slim xianxia fantasy swords isolated with transparent background: LEFT ice-blue straight silver blade with cyan crystalline energy and restrained gold hilt; CENTER crimson flame blade with black-red metal, jagged fiery edge and dark gold hilt; RIGHT violet spirit sword with pale silver-purple blade, ornate purple lotus guard and wispy violet aura. Each sword complete, tip at 5% cell height, pommel at 95%, hilt at 80%, centered at 50% cell width. Precise straight-on flat game sprite view. Painterly polished metallic detail, strong clear silhouette at 70px tall, glow restrained inside each own cell, generous transparent margins, no cross-cell overlap. No person, no hand, no text, no labels, no grid lines, no UI frame, no checkerboard, no black background. These images will be attached to a character hand and to a flying mount in an isometric RPG.
```

Prompt áo:

```text
Use case: stylized-concept. Asset type: a single production RPG costume item icon, transparent background. One elegant empty Chinese xianxia long robe outfit suspended front-facing, no body no head no hands, premium hand painted fantasy inventory icon. White silk robe with flowing sleeves and split long hem, vivid azure blue fabric panels and sash, ornate gold trim at shoulders belt and hems, intricate but readable embroidery. Symmetrical clear silhouette, top at 5% and hem at 94%, restrained dimensional shading, luminous but no aura or glow, no frame. Transparent exterior and transparent neck opening. Tall portrait 2:3 aspect ratio, centered fully visible garment, generous margins. Readable when displayed 72px tall. No hanger, no mannequin, no person, no face, no text, no label, no grid, no checkerboard, no black square. This base robe icon will be palette-recolored to match six different cosmetic color themes in game.
```
