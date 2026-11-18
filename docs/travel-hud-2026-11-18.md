# Chuyển map, chuyển động và HUD tỉ võ

Ngày 2026-11-18.

## Thay đổi

1. Chuyển map: chọn atlas cảnh vật/NPC/tán tu/boss theo map cần dùng. Không chờ toàn bộ bảy hiệu ứng Vương Lâm cùng atlas icon trước khi vào cảnh. Các chiêu đang trang bị được tải nền sau khi cảnh ổn định; hiệu ứng chưa có vẫn được yêu cầu khi sử dụng. Tải nền dùng `Image.decode()` riêng và hủy khi scene đóng, không chen vào hàng đợi tải map kế tiếp. Không đổi sát thương hay hồi chiêu.
2. Nền map được tái dùng qua các lần ghé lại, theo LRU. Mục tiêu bộ nhớ trang nền là 48 MiB trên thiết bị dùng cảm ứng và 96 MiB trên PC, gồm cả nền làng đã chuẩn bị. Map đang hiển thị được giữ nguyên nếu một mình nó vượt mức; khi rời map có thể bị loại khỏi cache. Chuyển cảnh giảm fade-out từ 350 xuống 100 ms, fade-in từ 400 xuống 160 ms.
3. Kiếm theo hướng của frame đang hiển thị, thay vì hướng input có thể đã quay trong khi động tác còn khóa. Nhân vật remote chọn frame trước khi đặt kiếm, tránh lệch một frame khi đổi hướng. Giữ điểm tay riêng cho tám pha chạy và các frame hành động.
4. Bước chạy hạ nhẹ: phần chân co theo chiều dọc 12%, thân trên dời xuống khoảng 4–6 px để nối liền tại hông. Chân trụ giữ nguyên mốc đất, scale thế giới và vùng va chạm không đổi. Điểm tay của kiếm chạy dùng cùng phép biến đổi.
5. Chân dung trưởng thành được cắt riêng theo vị trí mặt của từng nhân vật, thay cho một vùng cắt chung thường lấy cả thân áo. Căn lại vùng hình bên trong viền rồng; khung avatar vuông để viền tròn không bị kéo dọc. Đã thay 8 ảnh chân dung và 16 sheet chạy giao trình duyệt; xóa 24 file delivery cũ bị thay thế.
6. Loading dùng ba hàng bố cục thực: tên giai đoạn, nội dung tải, hướng dẫn. Dòng trạng thái và hướng dẫn không còn cùng tranh vị trí ở đáy. Container query theo chiều cao bề mặt game, kể cả khi viewport được xoay bằng CSS. Bố cục thấp có chế độ gọn riêng và giảm trang trí khi hiện lỗi/thử lại.
7. HUD có một hàng buff cố định dưới avatar/HP/MP, kể cả khi chưa có buff. Trên sân tỉ võ, buff nằm ngoài luồng bố cục của card HP/MP. Các hiệu ứng không làm nhiệm vụ hoặc sân đấu thay đổi vị trí/kích thước. Thông báo không có nhiệm vụ dùng 11 px trên PC, 9 px trên mobile.
8. Tỉ võ dùng bố cục phủ trên sân đấu: HP/MP hai góc, tiêu đề và đồng hồ giữa, thông tin luận kiếm bên trái, kỹ năng xếp cung bên phải. Thông tin điểm/thắng lấy dữ liệu xếp hạng hiện có; hiển thị dấu gạch khi chưa có dữ liệu. Trên màn hình thấp có thể mở/thu thông tin luận kiếm. Nút rời sân và các điều khiển tay vẫn hoạt động theo luồng cũ. Dùng lại ảnh sân đấu hiện có; không thêm tính năng quan chiến/chat mới chỉ vì xuất hiện trong hình tham khảo.

## Kết quả đo

[Số liệu và kiểm tra](travel-hud-2026-11-18.json). Bản production cô lập backend, Chrome headless với GPU phần mềm, viewport 1280 × 720, cache HTTP lạnh, giới hạn mạng 12 Mbps và độ trễ 40 ms. Đây là một lượt trước/sau cùng tuyến, không phải thống kê nhiều mẫu hay đo trên server thật.

| Chuyển cảnh | Trước | Sau |
| --- | ---: | ---: |
| Vào Đại Thừa Viện lần đầu | 23,92 s | 8,46 s |
| Sang Thác Ngọc lần đầu | 2,16 s | 3,86 s |
| Quay lại Đại Thừa Viện | 1,06 s | 0,44 s |
| Sang Rừng Linh Thú lần đầu | 1,35 s | 3,90 s |
| Về Vương Gia Thôn | 0,91 s | 1,01 s |

Tổng thời gian chờ trên tuyến giảm khoảng 40%. Một phần chi phí tải NPC/tán tu riêng được chuyển từ lần đầu rời làng sang lần đầu thực sự ghé map cần chúng, nên Thác Ngọc và Rừng Linh Thú chưa nhanh hơn trong lượt đo này. Những map đã bị loại khỏi cache phải tải/dựng lại nền. Vẫn còn tác vụ dài khi dựng map mới, đặc biệt trên GPU phần mềm; kết quả không bảo đảm chuyển mọi map tức thì hay 60 FPS trên điện thoại yếu.

## Xác minh

- 37 unit test trong 9 file: tải nền và hủy scene, retry sau tải lỗi, cache nền và giới hạn mobile, điểm chân/hông, hướng kiếm, animation, buff và nhiệm vụ.
- TypeScript, lint các module thay đổi, kiểm tra hash/alpha/metadata asset và build production đạt.
- Tuyến năm lần chuyển map không có texture bị thiếu, đúng map đích, có kiểm tra trạng thái cache.
- Kiểm tra trình duyệt xác nhận vị trí nhiệm vụ và kích thước sân không đổi khi có buff, đủ 8 nút chiến đấu/lướt cùng nút rời sân trong viewport mobile 844 × 390, 740 × 360 và 640 × 320.
- Loading thường và lỗi/thử lại không đè hướng dẫn ở 844 × 390, 740 × 360, 640 × 320 và 568 × 280. Kiểm tra trực quan 64 tổ hợp pha chạy/hướng cầm kiếm và chân dung mới.

Mobile là giả lập Chrome; chưa đo trên điện thoại Android/iPhone thật. Tỉ võ dùng dữ liệu luyện tay và snapshot mô phỏng, chưa kiểm tra hai tài khoản qua mạng. Không truy cập hay sửa tài khoản thật trong các lần kiểm tra.

Ảnh nguồn nhân vật giữ nguyên. File chạy và chân dung tái tạo bằng:

```powershell
npm.cmd run assets:startup -- --heroes-only
npm.cmd run assets:verify
npm.cmd run build
```

`--heroes-only` nay cũng cập nhật các vùng cắt chân dung trưởng thành, đồng thời giữ nguyên ảnh làng/NPC/nền đã chuẩn bị.
