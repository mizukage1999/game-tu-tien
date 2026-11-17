# Animation hành động nhân vật, bản 1

Ngày 2026-11-17. Bổ sung hình chuyển động thật cho cả 8 phái trưởng thành sau nhập môn. Mỗi trạng thái có đủ 8 hướng, gồm cả hướng nhìn từ sau khi đi lên.

| Trạng thái | Frame mỗi hướng | Cách chạy |
| --- | ---: | --- |
| Đứng nghỉ | 4 | Lặp, 3 frame/giây |
| Đánh thường | 8 | Ra đòn rồi thu thế |
| Skill nhanh | 8 | Lấy đà, xuất chiêu, thu thế |
| Skill mạnh | 12 | Thêm tư thế trung gian |
| Tuyệt kỹ | 12 | Thêm tư thế trung gian |
| Trúng đòn | 4 | Giật người, hồi thế |
| Tử vong | 8 | Ngã một lần, giữ frame cuối |

Tổng cộng **3.584 hình**, không tính lại các tên alias dùng chung chuỗi đánh thường. Ba đoạn combo đánh thường hiện cùng dùng bộ 8 hình; chưa phải ba bộ động tác riêng. Skill trong cùng nhóm nhanh/mạnh/tuyệt kỹ dùng chung động tác thân người của phái, còn hiệu ứng chiêu thức vẫn riêng. Giữ nguyên vòng chạy thật 8 frame/hướng đã có. Trẻ em giữ bộ chạy trước đó và chưa có bộ hành động chiến đấu mới; luật hiện tại chặn trẻ em đánh/dùng skill.

## Tích hợp gameplay

- Giữ scale thế giới `0.94`, cell trưởng thành 160 px và mốc chân 150 px. Các frame cắt gọn được gắn lại offset nên không thay vùng va chạm hay điểm chọn nhân vật. Vùng trong suốt ngoài phần hình cắt không nhận click.
- Đánh thường vẫn gây hit ở 125 ms, kết thúc ở 375 ms. Động tác thân người khi dùng skill giữ thời gian khóa khoảng 428,57 ms. Sát thương, MP, hồi chiêu và mốc thời gian VFX của từng skill giữ luồng hiện tại; không dời sát thương skill sang mốc animation thân người.
- Khi tải hình mới xong giữa một đòn đánh, chuỗi đang chạy vẫn hoàn tất với mốc hit cũ. Tên animation mới tách khỏi tên fallback để Phaser không dừng đòn đang chạy.
- Nhân vật local và `RemotePlayer` dùng cùng cách chọn động tác. Nhân vật remote giảm HP có phản ứng trúng đòn; tử vong không bị phát lại do cập nhật vị trí liên tục. Hướng trúng đòn/ngã dùng hướng hiển thị 8 chiều.
- Ngoại trang nhuộm cả chuỗi mới, giữ alpha. Hình nguồn Vương Lâm để tay trống; kiếm mặc định hoặc skin được ghép theo điểm tay từng frame, tránh hai thanh kiếm chồng nhau. Các phái khác giữ đạo cụ riêng trong hình nguồn.

## Asset và tải nền

Nguồn PNG trong suốt: [`art/hero-actions-v1`](../art/hero-actions-v1), 56 sheet được tạo bằng công cụ tích hợp `image_gen.imagegen`. [Toàn bộ prompt và đường dẫn ảnh đã chọn](hero-actions-v1-prompts.json) được lưu để tái tạo. Tham chiếu là dải đứng 8 hướng của từng nhân vật hiện có. Kích thước sheet thực tế 1.254 × 1.254; trình đóng gói dò các hàng alpha để giữ đủ đầu/chân ở tư thế ngã.

File giao trình duyệt nằm trong `public/assets/optimized/hero-actions-v1-*`, metadata tại [`heroActionAssets.json`](../src/data/heroActionAssets.json). PNG nguồn ở ngoài `public`, không được tải cùng game. [Báo cáo đóng gói](hero-action-encoding.json) ghi hash nguồn, metadata, dung lượng và alpha từng trang.

Mỗi phái có 5 trang WebP, mỗi trang tối đa 1.024 × 1.024 px, khoảng 3–4 MB/phái. Runtime chỉ yêu cầu bộ hành động của nhân vật trưởng thành đang cần hiển thị, giải mã bất đồng bộ và đưa từng trang lên texture qua các frame khác nhau. Trong lúc chờ vẫn có hình cũ hợp lệ. Màu ngoại trang xử lý từng nhóm nhỏ rồi nhường frame. Cache giữ các bộ đang dùng và tối đa một bộ phái/ngoại trang không dùng; mỗi bộ có 5 trang. Hình mới làm tăng dung lượng và bộ nhớ khi dùng, không bảo đảm 60 FPS trên mọi máy.

```powershell
npm.cmd run assets:hero-actions
npm.cmd run assets:verify
npm.cmd run build
```

Nếu sửa bộ cắt/đóng gói hoặc PNG nguồn, chạy lại `assets:hero-actions` trước khi build; kiểm tra hash sẽ báo nguồn cần cập nhật.

## Kiểm tra

[Kết quả kiểm tra](hero-actions-v1-validation.json) ghi số liệu thực đo. Có 21 unit test trong 6 file, kiểm tra TypeScript, lint các module animation và build production. Kiểm tra asset xác nhận đủ frame, kích thước, offset, hash và alpha không đổi khi nén.

Bản production cô lập backend chạy đủ 448 tổ hợp phái/trạng thái/hướng qua cả 3.584 frame trong Phaser, kiểm tra một hit mỗi đòn, đổi màu không đổi alpha, chọn nhân vật theo pixel, kiếm bám tay và giữ frame ngã. Có kiểm tra viewport mobile 844 × 390, DPR 2. Luồng vào làng bằng nhân vật nhỏ không tải ảnh hành động mới.

Kiểm tra remote dùng dữ liệu mô phỏng trong một trình duyệt; mobile là giả lập Chrome. Chưa kiểm tra trên điện thoại thật hoặc hai tài khoản online, nên kết quả không xác nhận FPS thiết bị hay độ trễ mạng.
