# Tải game, mobile, hiệu năng và tổ đội

Luồng vào game tải nhóm ảnh cần cho bản đồ hiện tại. Vương Gia Thôn chuẩn bị nhân vật tám hướng và hiệu ứng phái đang chọn; thư viện quái, diễn viên của khu vực khác và ảnh vật phẩm chiến đấu được chuẩn bị khi vào khu vực sử dụng chúng. Khi có người chơi thuộc phái khác đến gần, game tải hiệu ứng phái đó một lần. Chuyển bản đồ có tiến độ tải và chỉ bỏ lớp loading sau khi bản đồ đã sẵn sàng. Các atlas tư thế cũ đã được thay bởi bộ tám hướng không còn nằm trong lượt tải đầu.

Ảnh truyền xuống trình duyệt dùng bản WebP chất lượng 0,92 với tên chứa hash nội dung. Tổng 60 ảnh được chuyển từ 148,5 MB PNG thành 43,4 MB WebP. Đây là nén màu; kích thước và tọa độ atlas giữ nguyên. Công cụ đã giải mã lại từng ảnh và so sánh toàn bộ kênh alpha, sai lệch lớn nhất bằng 0. Ảnh PNG gốc tiếp tục là nguồn dựng bản giao ảnh.

Chạy `npm run assets:optimize` sau khi cập nhật ảnh nguồn; cần Chrome/Chromium cục bộ, có thể chỉ định bằng `CHROME_PATH`. Chạy `npm run assets:verify` để kiểm tra hash nguồn, kích thước atlas, bản ghi alpha và các file giao ảnh. Bước xác minh cũng chạy trong `npm run build`, giúp phát hiện ảnh nguồn đã đổi nhưng chưa tạo lại bản WebP. [Thông số từng ảnh](runtime-asset-encoding.json).

## Kết quả đo tải

Đo từ nút vào game ở form tạo nhân vật tới lúc Vương Gia Thôn hoạt động và lớp loading biến mất. Dùng hai bản Vite production, backend tài khoản giả cục bộ, headless Chrome với Canvas, CPU mô phỏng chậm 2 lần, mạng 40 Mbps/40 ms và tắt HTTP cache. Chạy xen kẽ trước/sau hai lượt mỗi bản; thời gian bên dưới là trung bình. Lượng ảnh chỉ tính tài nguyên bắt đầu tải sau lúc bấm vào game.

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| Thời gian vào bản đồ | 41,52 giây | 10,98 giây |
| Dữ liệu ảnh tải khi vào | 138,36 MB | 20,77 MB |
| Texture có mặt khi bản đồ sẵn sàng | 266 | 122 |
| Tổng điểm ảnh nguồn texture | 101,29 triệu | 57,10 triệu |

Thời gian giảm khoảng 74%, dữ liệu ảnh giảm khoảng 85% trong phép đo này. Kết quả không bao gồm quá trình đăng nhập server thật và không dự báo chính xác thời gian trên mọi mạng hay điện thoại. Tổng điểm ảnh nguồn là số liệu texture, không phải phép đo bộ nhớ GPU. [Dữ liệu gốc](runtime-benchmark.json).

## Khung hình

Game đặt mục tiêu 60 FPS và đo thời gian khung hình thực bằng đồng hồ trình duyệt trong các cửa sổ hai giây. Khi chậm kéo dài, bộ điều tiết giảm mật độ hạt sáng, đuôi hiệu ứng và bóng trang trí; chỉ nâng lại sau thời gian ổn định dài hơn. Canvas giữ ngân sách Retina đã chọn theo DPR, bộ nhớ và giới hạn GPU, tránh thay đổi framebuffer giữa trận. Tab ẩn và tải bản đồ không được tính là khung hình chơi game. Mức điều tiết không ghi đè lựa chọn đồ họa đã lưu.

Cảnh ngoài màn hình được ẩn theo vùng camera, chuyển động trang trí ngoài tầm nhìn được dừng; máy yếu có thể dừng thêm chuyển động trang trí. Chữ sát thương dùng pool có giới hạn. Hiệu ứng kỹ năng chính tiếp tục được vẽ. Khi vào tỉ võ, bản đồ phía sau dừng vẽ; chuyển động đấu sĩ dùng `translate3d` và nội suy bằng transform thay cho chuyển động `left/top`.

Kiểm tra ngày 30/10/2026 xác nhận bộ điều tiết nhận biết khung hình chậm thực tế, giữ kích thước Retina và bảo vệ hiệu ứng vận chiêu, trúng đòn cùng vùng sát thương kéo dài. Bản đồ hiện lại sau khi rời tỷ võ. [Chi tiết chiến đấu, tăng sức mạnh và hướng dẫn](combat-progression-clarity.md). Chưa có phép đo trên điện thoại vật lý; mức 60 FPS vẫn phụ thuộc CPU, GPU, nhiệt độ và chế độ tiết kiệm pin của máy.

## Nhập chữ và thao tác

Tên kênh chat nằm trên một dòng trên mobile. Ô chat dùng font 16 px để hạn chế zoom lúc nhập, khung chat theo visual viewport để ô nhập vẫn ở phía trên bàn phím. Thay đổi chiều cao khi mở bàn phím không tự làm game đổi hướng; thay đổi chiều rộng do xoay máy vẫn cập nhật bố cục.

Web chỉ thử khóa ngang khi trình duyệt hỗ trợ, và thử lại sau khi vào toàn màn hình. CSS xoay giao diện không xoay được bàn phím của hệ điều hành. Trên iPhone hoặc trình duyệt không cho khóa hướng, người chơi cần xoay máy ngang và tắt khóa xoay để có bàn phím ngang; gợi ý xuất hiện khi nhập ở tư thế dọc. [Giới hạn của API khóa hướng](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock), [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

Khi menu, thông tin người chơi, hội thoại hoặc chat đang mở, input của bản đồ được chặn; sprite và tên người chơi cũng kiểm tra trạng thái này trước khi mở thông tin. Thao tác vuốt trong bảng không điều khiển nhân vật phía sau. Phím Escape của menu hoạt động độc lập với bàn phím Phaser đã bị khóa.

Tab **Đội** cạnh nhiệm vụ đọc tổ đội và presence thật, hiển thị bản thân, đồng đội, trưởng đội, cảnh giới và vị trí. Danh sách cập nhật khi thành viên vào/rời, gộp kết nối trùng theo tài khoản, và có thao tác xem người chơi, mời, rời hoặc giải tán qua các luồng tổ đội hiện có.

## Xác minh

362 kiểm thử; bản build và lint thành công. Hai kiểm thử ảnh kỹ năng đã được cập nhật kỳ vọng đường dẫn từ PNG sang WebP. Công cụ xác minh kiểm tra đủ 60 ảnh nguồn và biến thể. Trình duyệt đã đi qua tạo nhân vật, chặn chọn người phía sau menu/thông tin, xem tổ đội, chat một dòng ở 667×375 và 390×844, nhập ở viewport ngang thu nhỏ, chuyển tông môn/bãi quái/phó bản, tải phái khác, vào tỉ võ và trở về. Không ghi dữ liệu vào tài khoản server thật.

Ảnh kiểm tra: [tổ đội](previews/runtime-party-mobile.png), [viewport nhập chat ngang](previews/runtime-keyboard-landscape.png), [tỉ võ](previews/runtime-arena-mobile.png).
