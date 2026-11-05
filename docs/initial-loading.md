# Tải game sau khi chọn nhân vật

Cập nhật 04/11/2026. Đo từ khi bấm **Vào game** đến khi Vương Gia Thôn dựng xong và lớp loading biến mất.

## Lượt tối ưu bộ tài nguyên dựng sẵn

Làng dùng một atlas chỉ chứa cảnh vật cần thiết; các hình giữ nguyên kích thước cắt. Tám nhân vật có sprite nhỏ và trưởng thành được chuẩn bị riêng, đủ tám hướng và các frame hoạt ảnh. Giới hạn hình không còn phải đọc pixel lúc vào game. Avatar cũng dùng ảnh riêng thay vì kéo cả atlas nhân vật.

Nền làng được dựng trước bằng chính hàm tạo nền và bố cục bản đồ của game, sau đó chia thành tám mảnh có viền chống hở. Mỗi mảnh tối đa 1026×1026; không tạo canvas toàn bản đồ trên điện thoại. Nền cũ được giải phóng khi rời map. Thay đổi mã tạo nền, bố cục hoặc ảnh nguồn sẽ làm bước xác minh asset báo cần tạo lại bằng `npm run assets:startup`.

Màn chọn nhân vật và màn tiếp tục tải/giải mã ảnh ở nền, khởi tạo bộ dựng hình rồi tạm dừng vòng lặp. Từng texture được đưa lên GPU khi chờ chọn nhân vật; cảnh game chỉ khởi chạy sau khi tạo tên thành công hoặc bấm tiếp tục. Thoát khỏi màn này giải phóng bộ dựng hình và cache. Khi ảnh tải trước không thành công, loader thông thường tiếp tục đảm nhiệm việc tải.

Đo **bản production** có gắn bộ ghi số liệu, backend offline, Chrome WebGL SwiftShader, CPU chậm 4 lần, 844×390, DPR 1, mạng 12 Mbps/60 ms và tắt HTTP cache:

| Trạng thái | Từ nút vào game đến làng | Asset tải sau nút |
| --- | ---: | ---: |
| Tải lạnh tài nguyên làng | 11,76 giây | 4,44 MB |
| Ảnh và GPU đã chuẩn bị ở màn chọn | 3,74 giây | 1,05 MB |

Mẫu đã chuẩn bị dành khoảng **5 giây trước nút vào game** để tải/giải mã ảnh và đưa texture lên GPU, mô phỏng thời gian người chơi chọn phái và nhập tên. Đây là công việc diễn ra sớm hơn, không phải loại bỏ toàn bộ thời gian tải ban đầu. Mẫu tải lạnh chặn tải trước ảnh làng đến khi bấm nút, nhưng bộ dựng hình vẫn có thể khởi tạo tại màn chọn. Hai mẫu chưa đo phản hồi đăng nhập/lưu nhân vật trên server thật và chưa chạy trên điện thoại vật lý.

Bước chuẩn bị sprite còn khoảng 69–102 ms; dựng nền sẵn còn khoảng 15–18 ms. Bản production, TypeScript, lint và 43 kiểm thử liên quan đã qua. Kiểm tra trình duyệt bao gồm chọn tên hợp lệ, giữ cảnh game chưa chạy khi chọn tên, hủy bộ dựng hình đang nghỉ rồi vào lại, chuyển map, nhập môn, NPC, kỹ năng người chơi khác và đủ hoạt ảnh tám hướng cho 16 phiên bản nhân vật.

`npm run assets:startup` tạo lại sprite, atlas, avatar và nền làng từ ảnh gốc; cần Chrome/Chromium cục bộ hoặc `CHROME_PATH`. Công cụ đối chiếu kênh alpha từng pixel, ghi hash ảnh nguồn, mã dựng hình, metadata và đầu ra trong `docs/startup-asset-encoding.json`. `npm run assets:verify` kiểm tra cả 48 tài nguyên và tọa độ atlas; kiểm tra này nằm trong build.

Số đo nằm ở mục `preparedStartup` trong [benchmark](initial-loading-benchmark.json). Các bảng dưới lưu kết quả các lượt tối ưu trước.

## Những phần đã tối ưu

- Chỉ tải cảnh vật dùng trong map đầu và sprite nhỏ của nhân vật đang chọn. Ảnh trưởng thành và hiệu ứng riêng tải khi cần; người chơi trưởng thành đến làng vẫn có hình và kỹ năng đầy đủ.
- Sáu NPC làng dùng giới hạn chiều cao đo sẵn, tránh sáu lần đọc pixel đồng bộ trong lúc dựng cảnh.
- Icon túi đồ, kỹ năng và biểu tượng loading được cắt sẵn thành 45 tệp WebP. Trình duyệt tải icon đang hiện, không phải tải hai atlas UI đầy đủ vào Phaser rồi cắt và mã hóa PNG ở mỗi lần mở game.
- Nhân vật nhỏ chưa dùng huy hiệu cảnh giới hoặc atlas hiệu ứng chiến đấu cũ. Huy hiệu tải khi tu sĩ đầu tiên xuất hiện; atlas chiến đấu được tải và đăng ký hoạt ảnh khi nhập môn.
- Không mã hóa cả atlas hiệu ứng thành PNG trong lượt chuẩn bị bản đồ; giao diện xem trước dùng trực tiếp ảnh nguồn.

## Kết quả đo cục bộ

Chrome headless, WebGL bằng SwiftShader, viewport 844×390, DPR 1, CPU giả lập chậm 4 lần; mạng giới hạn **1.500.000 byte/giây (~12 Mbps)**, độ trễ 60 ms, tắt HTTP cache. Backend bị tắt trong môi trường thử, không dùng tài khoản server thật. Các phép đo có CPU profiler nên bao gồm chi phí ghi profile.

| Chỉ số | Sau lượt tối ưu NPC | Sau lượt tối ưu icon và tải trễ |
| --- | ---: | ---: |
| Ảnh và dữ liệu asset tải sau nút Vào game | 11.301.125 byte | 6.699.894 byte |
| Số yêu cầu asset của trình duyệt | 24 | 20 |
| Số mục loader Phaser hoàn thành | 22 | 15 |
| Thời gian vào làng | 20,25 giây | 15,10 / 14,41 / 18,45 giây |

Lượng dữ liệu giảm **40,7%**. Ba lần chạy sau có trung bình khoảng **16 giây**. Đây là kiểm tra giả lập trên máy phát triển, không phải phép đo Redmi Note 11 hoặc iPhone. Biến động CPU/GPU của máy chạy và mạng thực có thể làm kết quả khác; chưa đo thời gian đăng nhập và lưu nhân vật trên server thật.

[Số đo gốc và thiết lập](initial-loading-benchmark.json).

## Tạo lại icon sau khi sửa ảnh

`npm run assets:icons` dùng Chrome/Chromium cục bộ, có thể chỉ định đường dẫn bằng `CHROME_PATH`. Nguồn vẫn là ba ảnh PNG hiện có. Tọa độ cắt nằm trong `src/data/uiIconLayout.json`; đường dẫn đầu ra chứa hash trong `src/data/uiIconAssets.json`.

Công cụ đối chiếu từng pixel alpha sau khi mã hóa, chỉ ghi nhận icon khi sai lệch alpha bằng 0. `npm run assets:verify` kiểm tra hash ảnh nguồn, layout, từng tệp WebP và độ đầy đủ của cả 45 icon. Bước xác minh này cũng chạy trong build để tránh dùng icon cũ sau khi sửa atlas.

## Xác minh

- TypeScript, 71 kiểm thử liên quan và lint các tệp TypeScript thay đổi đã qua.
- Đóng gói production thành công với đúng cấu hình `vite.config.ts`, gồm kiểm tra admin không kéo Phaser vào entry. Trong sandbox Windows, đã dùng Vite API để nạp cấu hình đã chuyển TypeScript sang ESM vì bộ nạp esbuild mặc định bị chặn đọc thư mục cha.
- 11 bước kiểm tra trình duyệt WebGL đã qua: sprite nhỏ và sáu NPC, tài nguyên không tải sớm, giải mã 45 icon, huy hiệu tu sĩ tải trễ, sprite trưởng thành tải trễ, hiệu ứng Wang tải riêng từng chiêu, không kéo hiệu ứng không dùng, nhập môn có hoạt ảnh chiến đấu, bãi quái có quái và linh thú dự phòng, trở lại làng và không có exception trình duyệt.
