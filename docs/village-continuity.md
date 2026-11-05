# HUD, nhập môn và menu cấp 99

## Thay đổi

1. HUD dùng khung vàng, nền xanh đậm, avatar có huy hiệu cấp, biểu tượng HP/MP và hàng chế độ PK/vị trí. Nhiệm Vụ và Tổ Đội có icon riêng, tab đang chọn, chấm báo tổ đội và bố cục thành viên. Mobile giữ tiêu đề chương và tối đa hai mục tiêu chưa hoàn thành, có cuộn trong phần nhiệm vụ.
2. `setAuto` không làm gì nếu trạng thái đã đúng. Đi bằng chuột khi Auto đang tắt không còn tạo log tắt chiến đấu; thao tác tắt Auto thật vẫn có thông báo.
3. Bộ ảnh khởi đầu trước đây chứa `giu_suoi`, trong khi NPC thứ sáu của làng là `a_moc`. Bộ đóng gói nay có đúng sáu NPC, A Mộc lấy từ ô gốc trong `travel-people-v2.png`, có dữ liệu bounds và chân dung. Chiều cao A Mộc tương ứng nhân vật nhỏ.
4. Nhập môn thay rig trên sprite đang có bằng tải ảnh riêng bất đồng bộ. Giữ scene, nền, vị trí, thân vật lý, NPC và kết nối. Chuẩn bị trước hình trưởng thành khi nhiệm vụ nhập môn được nhận. Không gọi `scene.restart()` cho thay đổi tuổi thơ → trưởng thành.
5. Chuyển lên cấp 99 không tạo thông báo `PowerGrowthNotice`. Phần thưởng và cấp vẫn được áp dụng; nâng trang bị, kỹ năng hoặc đột phá khác vẫn có phản hồi.
6. Nhân vật vốn có **8 hướng**, mỗi hướng đứng có một tư thế. Thêm nhịp thở bằng scale dọc rất nhẹ, neo theo chân, khi đứng yên. Đây là chuyển động nhẹ trên sprite hiện có; không phải bộ khung hình vẽ mới cho quần áo/tóc.
7. Tách tám chân dung người lớn khỏi atlas toàn thân và chuẩn bị **87 icon 128×128** cho các phái/tuyệt kỹ (tổng 1,254,998 byte). Menu/HUD không còn cần nguyên atlas hiệu ứng để vẽ icon. Bộ tạo hiệu ứng runtime bỏ bước cắt/encode PNG icon đã có sẵn. Xem chiêu chỉ tải đầy đủ khi người chơi bấm, giải mã bất đồng bộ trước khi bắt đầu hoạt ảnh, có trạng thái tải/thử lại ngay trên nút.

## Tái tạo ảnh

- `npm run assets:startup`: NPC làng, chân dung, hero và nền khởi đầu.
- `npm run assets:menu`: icon phái và tuyệt kỹ.
- `npm run assets:verify`: kiểm tra hash ảnh nguồn, layout, đầu ra và alpha.

Ảnh gốc được giữ nguyên; các bản giao diện có hash dưới `public/assets/optimized`. Các file `startup-asset-encoding.json` và `menu-icon-encoding.json` ghi nguồn và kết quả mã hóa. Alpha được đối chiếu sau giải mã, sai lệch bằng 0.

## Kiểm tra

- Production build, TypeScript, ESLint và 85 ca kiểm thử liên quan đã qua.
- Trình duyệt production với backend offline, PC 1280×720 và mobile mô phỏng 844×390: kiểm tra A Mộc, log di chuyển, trả thật nhiệm vụ `village_9`, giữ scene/nền/vị trí khi nhập môn, đủ tám hướng đứng, nhịp thở, cấp 99 không popup, đủ 18 menu, trạng thái tổ đội, tải chiêu khi bấm và không có JavaScript exception.
- Kiểm tra ảnh chụp HUD, nhiệm vụ, tổ đội và A Mộc ở cả hai kích thước. Luồng nhập môn được thử tại Ngoại Môn, không thay bằng thao tác chỉ gán `admitted`.

Các thử nghiệm trình duyệt dùng WebGL SwiftShader và dữ liệu phần thưởng cấp 99 mô phỏng tại client. Không thực hiện nhận thư/cấp quà trên tài khoản thật. Không lấy thời gian dựng DOM trong bài thử làm cam kết thời gian hiện đầy đủ ảnh hoặc FPS trên Redmi/iPhone thật.
