# Chu kỳ chạy thật theo 8 hướng

Ngày 2026-11-17.

Đã thay vòng chạy 4 frame lặp lại tư thế đứng bằng **8 tư thế chạy riêng cho mỗi hướng**, chạy ở 12 frame/giây. Cả 8 phái đều có bản trưởng thành và thưở nhỏ: 16 atlas nguồn, tổng cộng **1.024 frame chạy**. Tay, đầu gối, chân và tà áo đổi tư thế qua chu kỳ; hướng lên dùng hình nhìn từ sau.

Các hình nguồn được tạo bằng công cụ tích hợp `image_gen.imagegen`, tham chiếu dải đứng 8 hướng hiện có của từng nhân vật. Nguồn PNG nền trong suốt nằm tại [`public/assets/heroes-run-v1`](../public/assets/heroes-run-v1). [Bộ prompt đầy đủ](hero-run-v1-prompts.json) ghi từng nhân vật, độ tuổi và đường dẫn nguồn đã chọn. Tool trả atlas 1.254 × 1.254; trình đóng gói chia theo kích thước thực, không giả định đầu ra 2.048 px như kích thước đề nghị trong prompt.

## Trong game

- Giữ scale thế giới `0.94`, vùng va chạm và mốc chân. Thưở nhỏ vẫn dùng cell 128 px, trưởng thành 160 px.
- Khi đổi hướng trong lúc chạy, giữ chỉ số bước hiện tại. Dừng lại trở về hình đứng gốc.
- Đứng/ra chiêu giữ hình gốc và thời điểm đánh trúng. Thay đổi này chỉ bổ sung chuyển động chạy.
- Ngoại trang được nhuộm trên cả 8 pha chạy mới. Vương Lâm chạy với tay trống trong hình nguồn; game ghép kiếm thường hoặc skin vào điểm cầm tay của từng frame. Hai tư thế đứng/ra chiêu vẫn dùng mặt nạ kiếm cũ khi thay skin.
- Cùng atlas và animation được dùng cho nhân vật local và `RemotePlayer`.

## Tải và đóng gói

Sheet giao cho trình duyệt có 8 cột × 10 hàng: đứng ở hàng 0, ra chiêu ở hàng 1, chạy ở hàng 2–9. Bản trưởng thành 1.280 × 1.600; bản nhỏ 1.024 × 1.280. Trình đóng gói giữ chung tỉ lệ cho 64 hình chạy và loại mảnh hình lạc ở mép cell trước khi căn chân.

Runtime tải WebP đã đóng gói qua `startupAssets.json`, không tải 16 PNG nguồn. Luồng vào làng vẫn chỉ tải sheet của nhân vật được chọn; nhân vật khác tải theo nhu cầu. Ví dụ sheet Vương Lâm nhỏ tăng từ 101.394 lên 279.680 byte; bản trưởng thành từ 266.326 lên 570.376 byte. Có thêm hình thật nên dung lượng và bộ nhớ texture tăng; đây không phải thay đổi giảm tải.

Để chỉ xây lại chuyển động nhân vật, giữ nguyên các ảnh làng/NPC/chân dung:

```powershell
npm.cmd run assets:startup -- --heroes-only
npm.cmd run assets:verify
```

Chế độ này kiểm tra hash các nguồn ngoài chuyển động trước khi giữ lại atlas cũ. Nếu sửa nguồn bản đồ, NPC, chân dung hoặc cách cắt hình gốc, chạy `npm.cmd run assets:startup` đầy đủ. Chỉ 16 WebP nhân vật được thay ở lần cập nhật này; các WebP nhân vật cũ đã được bỏ khỏi repo.

## Kiểm tra

[Kết quả kiểm tra](hero-run-v1-validation.json): 17 unit test trong 5 file, TypeScript, lint các file thay đổi và build production đều đạt. Kiểm tra asset xác nhận hash, metadata và alpha của atlas.

Bản production cô lập backend chạy đủ 128 animation hướng chạy trong Phaser, mỗi animation qua đủ 8 frame. Đã kiểm tra chuyển động trẻ em/người lớn, dừng về đứng, một lần đánh trúng, đổi màu cả 8 pha không mất alpha, kiếm thường/skin, nhân vật remote mô phỏng và viewport mobile 844 × 390 DPR2. Lúc vào làng chỉ có một yêu cầu tải sheet nhân vật đang chọn.

Đây là kiểm tra Chrome trên máy hiện tại và mobile giả lập, chưa phải thử trên điện thoại thật hoặc hai tài khoản online. Không dùng kết quả này để cam kết 60 FPS hay độ trễ server.
