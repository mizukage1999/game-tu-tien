# Sprite tuyệt kỹ Vương Lâm v2

Bốn kỹ năng dùng atlas RGBA mới, mỗi atlas có 24 khung (6 cột × 4 hàng, ô nguồn 256 × 256), cùng bốn icon riêng nền trong suốt:

| Kỹ năng | Hình ảnh |
| --- | --- |
| Trảm La Quyết | Lưỡi liềm lam/cyan bay theo hướng đánh, đuôi kiếm quang và mảnh vỡ khi nổ |
| Hóa Ma Chỉ | Chỉ kình tím, lõi sáng hẹp, tia điện và chớp trúng đích |
| Định Thân Thuật | Pháp ấn lam, xích dựng quanh mục tiêu, giữ trói rồi tan biến |
| Đạo Hóa Hoàng Tuyền | Xoáy tím, hồn ảnh và đầu lâu, nhịp bùng sáng rồi tàn dần |

Nguồn hình được tạo bằng **built-in imagegen**. Prompt đầy đủ, file nguồn và đường dẫn năm asset nằm trong [wang-skills-v2-assets.json](wang-skills-v2-assets.json). Các PNG gốc giữ nguyên; WebP phục vụ tải game nằm trong `public/assets/optimized`, được tham chiếu qua `optimizedAssets.json`.

HUD, thư viện kỹ năng, phần xem chiêu, map và tỷ võ đều dùng bộ mới. `wangVisual` chia pha tụ lực, di chuyển, trúng đích/duy trì và tan biến; hai renderer dùng chung thời gian chuyển khung. Chiêu định hướng xoay theo hướng đánh, pháp ấn và xoáy giữ góc nhìn mặt đất. Định Thân trong online chọn mục tiêu sau thời gian xuất chiêu và vẽ xích tại mục tiêu. Hoàng Tuyền nằm dưới nhân vật để người chơi vẫn nhìn thấy tư thế.

Các giá trị sát thương, MP, hồi chiêu, số lần gây sát thương và thời gian khống chế giữ nguyên. Không thay dữ liệu lưu hay giao thức online. Dịch Linh Ấn tiếp tục dùng bộ hình hiện có.

Runtime ghép mỗi atlas thành 960 × 640 (ô 160 × 160), tổng bộ nhớ RGBA bốn atlas khoảng 9,4 MiB. Xóa texture nguồn sau khi ghép; dùng chung texture giữa các lần thi triển và hủy sprite khi kết thúc. Năm WebP mới tổng khoảng 4,2 MiB, so với khoảng 11,8 MiB PNG nguồn. Có thể mã hóa riêng asset thay vì chạy lại toàn bộ bằng:

```powershell
node scripts/optimize-runtime-assets.mjs /assets/skills/wang-tram-la-v2.png /assets/skills/wang-hoa-ma-chi-v2.png /assets/skills/wang-dinh-than-v2.png /assets/skills/wang-hoang-tuyen-v2.png /assets/skills/wang-signature-icons-v2.png
```

Kiểm chứng: 489 kiểm thử qua; lint, TypeScript và production build qua. Kiểm tra Chrome cục bộ ở PC 1440 × 900, mobile ngang 844 × 390 và 640 × 360: HUD/preview, nút thi triển tỷ võ, sprite bốn chiêu trong sân, tám hướng Trảm La Quyết và việc hủy sprite. Hai phiên trình duyệt dùng relay online giả lập xác nhận người đứng gần nhận và vẽ đủ bốn hiệu ứng. Không thao tác server hay dữ liệu người chơi thật.
