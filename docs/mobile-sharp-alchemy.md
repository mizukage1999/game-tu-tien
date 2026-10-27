# Độ nét mobile, trở về sau tỉ võ và Đan Phòng

## Đồ họa mobile

- Mặc định Sắc nét: dùng device pixel ratio thật, tối đa 3× và ngân sách 8 triệu pixel. iPhone 844×390 ở DPR 3 có framebuffer 2532×1170. Android DPR 2,75 giữ 2,75×.
- Không còn hạ độ phân giải xuống 1,25× hoặc 0,85× khi tier hiệu năng tăng. Chỉ giảm hiệu ứng phụ, hạt và trang trí; không thay đổi kỹ năng, sát thương hoặc chất lượng chữ DOM.
- Tùy chọn Nhẹ và Cân bằng vẫn còn trong Cài đặt. Chuyển cấu hình thiết bị v1 sang v2: giữ Nhẹ, nâng Cân bằng cũ lên mặc định Sắc nét; lựa chọn mới được lưu độc lập.
- Tắt MSAA của WebGL để tránh bộ đệm khử răng cưa lớn trên điện thoại. Vẫn giữ lọc tuyến tính cho ảnh vẽ và antialias Canvas; không dùng pixelated rendering.
- Không tăng độ phân giải canvas theo tier giữa trận nên không liên tục cấp phát lại framebuffer.

## Trở về từ tỉ võ

- Đóng trận dừng timer, giải phóng engine và gỡ overlay trước khi map được vẽ lại sau hai animation frame.
- Xóa phím/joystick/pointer còn giữ và reset lịch sử delta của game loop trước khi resume.
- Không dựng lại scene hoặc texture atlas khi trở về. Kết nối map chỉ mở lại khi scene còn paused và không có trận mới.
- Hủy callback trở về nếu có trận mới hoặc scene shutdown; gọi đóng khi không có trận không còn phát resume dư.
- Thiếu dữ liệu đấu sĩ hiện nút trở về thay vì dereference đối tượng không tồn tại.

## Đan Phòng

- Nền lò đan mới, năm mục: Lò đan, Luyện đan, Công thức, Đan dược, Linh dược.
- Dùng các công thức thật hiện có. Hiển thị lượng có/cần và thông báo thiếu/thành công ngay trong công thức.
- Luyện 1–99 viên với nút MAX dựa trên tài nguyên thật. Kiểm tra và trừ toàn bộ chi phí một lần; nhiệm vụ ghi nhận đúng số viên.
- Dược các sử dụng đan dược thật. Phá Cảnh Đan dẫn đến tu luyện; không bị tiêu hao như đan hồi phục.
- Nâng lò dùng công trình động phủ hiện có, đúng điều kiện và chi phí. Linh dược có nút đến map thu thập thật.
- Trên màn hình hẹp, danh sách và phần nội dung cuộn độc lập; tiêu đề, thông báo nguyên liệu/kết quả và nút luyện luôn nằm trong khung, không che nút số lượng.

## Kiểm chứng

- 365 kiểm thử được xác minh; build production và lint thành công.
- Kiểm tra WebGL bằng Chromium với framebuffer Retina, xoay màn hình, giả lập Android/iPhone và tier hiệu năng thấp.
- Năm trận luyện võ chạy engine đến kết quả, nhấn Trở về, map hiện lại đúng độ nét; không có exception trình duyệt. JS heap sau GC ở năm lượt khoảng 21,0 / 21,7 / 21,5 / 20,2 / 22,3 MB.
- Lặp lại năm trận với Canvas dự phòng: trở về thành công; JS heap sau GC khoảng 20,0 / 19,8 / 19,9 / 20,3 / 20,5 MB, không có exception.
- Kiểm tra giả lập không thay thế đo trên Android/iPhone thật. Chưa thể bảo đảm hết lỗi hệ điều hành đóng tab do thiếu bộ nhớ trên mọi thiết bị.
- Bố cục Đan Phòng vừa trong 667×375, 390×844 xoay ngang bằng CSS và desktop 1440×900. Kết quả luyện và nút thao tác còn thấy ngay sau khi luyện; không cần cuộn để đọc kết quả.

Ảnh giao diện: [Lò đan](previews/alchemy-room-mobile-v2.png), [Luyện đan](previews/alchemy-brew-mobile-v2.png).

## Artwork

Tool: built-in `image_gen`, theo skill `imagegen`.

Asset dùng trong game: `public/assets/journey/alchemy-room-v2.png` (1536×1024, PNG, 2.85 MB). Tải khi vào Đan Phòng; không thêm vào preload của map.

Prompt đã dùng:

> Use case: stylized-concept. Asset type: production background illustration for an existing Vietnamese xianxia game's interactive Alchemy Room (Đan Phòng), not a mockup. Use attached Alchemy Room reference as style and subject guidance only: ornate golden bronze alchemy furnace, blue moonlit temple interior, warm amber fire and lamps, distant mountain roofs, shelves of medicinal jars, flowering branches. One full-bleed wide landscape 1536x1024 high detail painting, crisp 2.5D game illustration. A magnificent round golden-bronze cauldron at center with intricate dragon handles and an emerald/gold spiritual flame inside, whole cauldron on stone plinth. Paper lanterns, jars and shelves at sides, temple doorway with moonlit mountains behind. A small seated white-robed alchemist at bottom left. Rich dark navy, bronze and jade, magical highlights, clean silhouettes and sharp material detail. Quieter dark areas along bottom and upper left for actual HTML overlay. NO typography, labels, watermark, currency bars, buttons or interface borders. Artwork layer only.
