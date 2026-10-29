# Địch Linh Ấn, Tịch Diệt Chỉ và Luyện Hồn Thuật

Địch Linh Ấn dùng sprite bàn tay vàng giáng xuống, pháp ấn dưới đất, chấn động và bụi tàn. Giữ nguyên MP, hồi chiêu, vùng đánh, sát thương và thời gian khống chế hiện có. Renderer căn pha chạm đất theo mốc đánh của từng chế độ.

Hai tuyệt kỹ mới dành cho Vương Lâm, chọn trong **Kỹ Năng → Đặc trưng**, rồi gán vào một trong sáu ô chiêu (ô 2–7). Giữ nguyên đánh thường và nút lướt độc lập. Bộ chiêu được lưu cùng nhân vật.

| Chiêu | Mở ở | MP / hồi chiêu | Cách đánh |
| --- | --- | --- | --- |
| Tịch Diệt Chỉ | Lv.30 | 230 / 18 giây | Ma thủ tím xuất từ vòng ấn, chỉ một mục tiêu đầu tiên trên đường đánh; xuyên 50% phòng ngự, 25% gây choáng 0,35 giây, xuất chiêu 0,6 giây để đối phương có thể né ngang |
| Luyện Hồn Thuật | Lv.35 | 320 / 24 giây | Đặt hồn phiên phía trước, sáu đợt mỗi 0,6 giây, hồn ảnh xoay quanh vùng; giảm 20% phòng ngự, hút 20% sát thương, giới hạn hồi 2% HP tối đa mỗi đợt |

Mỗi chiêu có 24 khung nền trong suốt trong atlas 1536 × 1024, cùng icon riêng. Runtime dùng ô 160 × 160 và hủy sprite sau khi kết thúc. Bộ ba đi qua cùng luồng HUD, thư viện, xem thử, đánh quái, online, phó bản và tỷ võ; không tạo thêm nút HUD. Hồn phiên là vùng hiệu ứng có thời hạn, không tạo thực thể linh thú hay hồn phách tồn tại vĩnh viễn.

Hình được tạo bằng **built-in imagegen**. PNG nguồn, prompt và đường dẫn bản gốc được lưu trong [wang-ritual-skills-assets.json](wang-ritual-skills-assets.json). Bốn WebP mới giữ alpha, tổng khoảng 3,46 MiB; không thay thế PNG gốc. Các sprite của bốn chiêu được làm ở lượt trước vẫn giữ nguyên.

Kiểm chứng: toàn bộ 495 kiểm thử qua, gồm gán/lưu/khôi phục chiêu mới, giới hạn hệ nhân vật, xuyên giáp, né chiêu, hồi chiêu, sáu đợt hồn phiên, hút máu có giới hạn và không hồi từ phần sát thương bị lá chắn hấp thụ trong tỷ võ. Kiểm thử hai client xác nhận chọn đúng một mục tiêu Tịch Diệt Chỉ và chỉ authority gửi sáu lần hút máu, không cấp trùng.

Kiểm tra Chrome cục bộ ở 1440 × 900, 844 × 390 và 640 × 360: icon HUD, thao tác đổi chiêu, xem thử, nút ra chiêu tỷ võ, sprite trong map và sân đấu, hủy sprite khi kết thúc. Hai phiên trình duyệt dùng relay giả lập xác nhận người đứng gần thấy cả ba hiệu ứng. Chưa thao tác dữ liệu người chơi hay deploy lên server thật.
