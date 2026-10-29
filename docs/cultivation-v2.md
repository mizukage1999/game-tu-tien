# Tên nhân vật, sprite tuổi thơ và tu luyện

Tên nhân vật được giữ bằng RPC `claim_character_name` trước khi ghi save đầu tiên. Bảng `character_names` có khóa duy nhất cho tên chuẩn hóa Unicode NFC, khoảng trắng và chữ thường. Trùng tên, mất mạng hoặc thiếu migration đều giữ người chơi ở form tạo nhân vật với lỗi tại chỗ. Đăng nhập ở nơi khác trong lúc giữ tên khiến kết quả cũ bị từ chối. Tên hiển thị trong map dùng tên người chơi đã chọn; biệt danh tuổi thơ chỉ dùng trong lời thoại cốt truyện.

Form tạo mới để trống ô tên và yêu cầu người chơi nhập tên riêng từ 6–16 ký tự sau chuẩn hóa; đổi hệ nhân vật không đổi tên đang nhập. Server kiểm tra lại giới hạn này. Tên ngắn đã lưu từ trước được giữ nguyên; không phải đổi tên mỗi lần đăng nhập. Nâng cấp server cũ bằng [player-access.sql](../supabase/player-access.sql), theo [hướng dẫn truy cập v2](player-access-v2.md).

Chạy `supabase/character-names.sql` sau `schema.sql` và `single-session.sql` trong SQL Editor của Supabase, trước khi triển khai client này. Migration giữ nguyên tiến trình; trong các save trùng tên cũ, save được cập nhật sớm nhất giữ tên gốc, các save còn lại nhận hậu tố theo ID tài khoản. Tên từ cloud là nguồn chuẩn khi hợp nhất với cache trình duyệt. Mọi lần ghi save đều phải khớp tên đã giữ. Xóa nhân vật giải phóng tên. Migration đã được kiểm tra với PostgreSQL cục bộ qua PGlite; chưa chạy trên server thật trong phiên làm việc này.

Atlas trẻ em có tám hàng cao khác nhau. `heroAtlas.ts` định nghĩa vùng cắt theo từng cột để giữ đủ mũ, chân và bàn chân cho cả tám phái, tám hướng. Phaser, hình trong menu và avatar cùng dùng nguồn tọa độ này. Không sửa hay phóng to bitmap để che lỗi cắt.

Bảng **Tu Luyện** có dải 12 cảnh giới, bốn giai đoạn, hình tọa thiền đúng phái, EXP thật, tốc độ hấp thu tại vị trí hiện tại, thuộc tính dự kiến và số nguyên liệu đang có. Xem trước cảnh giới không tăng chỉ số hay tiêu hao tài nguyên. Nút tọa thiền dùng hành động đang có trong map; nút Kỹ Năng và Bí Thuật Tông Môn mở các hệ thống tương ứng. Nút chính nằm ngoài vùng cuộn trên cả PC và mobile.

Bảng **Đột Phá** hiển thị điều kiện và nguyên liệu thiếu ngay trong bảng. Đạt Đại Viên Mãn, đủ EXP, Linh Khí, Linh Thạch và Phá Cảnh Đan theo cảnh giới mới được bắt đầu Thiên Kiếp tại tông môn. Số đan bắt đầu từ 1 viên khi lên Trúc Cơ, gấp đôi ở mỗi đại cảnh giới tiếp theo; công thức và nguồn nguyên liệu được mô tả tại [cân bằng đột phá](cultivation-balance.md). Nguyên liệu trừ một lần lúc bắt đầu; tọa thiền và ngự hành dừng để người chơi điều khiển né sét.

Thiên Kiếp có từ 4 đến 9 đợt tùy cảnh giới, 1–3 vùng sét mỗi đợt; các cảnh giới cao có thời gian báo chiêu ngắn hơn. Vùng cảnh báo khớp bán kính sát thương, sét có hiệu ứng đánh xuống thực tế. Chỉ sống sót qua toàn bộ đợt và thời gian thử thách mới tăng cảnh giới. Bị hạ gục quay về tông môn theo luồng hiện có, giữ cảnh giới và EXP; nguyên liệu đã tiêu hao không hoàn lại. Bộ đếm không bỏ qua thử thách khi tab chạy nền, và sét của một lượt cũ không đánh vào lượt thử mới.

Ảnh được tạo bằng built-in imagegen và lưu trong `public/assets/ui/cultivation/`. Nguồn, prompt đầy đủ và thông số alpha ở [cultivation-v2-assets.json](cultivation-v2-assets.json).

Kiểm tra: 331 kiểm thử / 54 file, build, lint; PostgreSQL cục bộ kiểm tra chuẩn hóa và trùng tên, RLS, phiên hết hiệu lực, ghi save và xóa tên. Trình duyệt kiểm tra 64 hướng sprite trẻ em, lỗi trùng tên trước khi vào map, hai tab tu luyện/đột phá tại PC 1440×900, 1280×600, mobile 844×390, 667×375 và iPhone dọc 390×844. Đã thử tọa thiền nhận EXP, đứng trong vùng sét chịu sát thương, chết không tăng cảnh giới, và sống qua đủ bảy đợt mới tăng từ Vấn Đỉnh lên Âm Hư. Lần kiểm tra sống sót dùng hồi HP trong công cụ QA để đo đủ chu kỳ; game thật không có hồi HP tự động này.

Ảnh xem trước: [PC](previews/cultivation-v2-train-1440.png), [mobile](previews/cultivation-v2-train-667.png), [đột phá](previews/cultivation-v2-breakthrough-667.png), [sét đánh](previews/cultivation-v2-trial-lightning-mobile.png).
