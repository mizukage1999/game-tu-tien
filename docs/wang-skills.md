# Tuyệt kỹ Vương Lâm và sửa giao diện chiến đấu

Vương Lâm trưởng thành có thêm năm chiêu. Mở **Kỹ Năng**, chọn ô 2–4 rồi bấm **Dùng ở ô…** tại chiêu muốn dùng. Chọn một chiêu đang ở ô khác sẽ đổi chỗ hai chiêu. Đánh thường ở ô 1 và nút Lướt độc lập được giữ lại. Bộ chiêu đã chọn được lưu và dùng chung ở map với sân tỷ võ.

| Chiêu | MP | Hồi cơ bản | Tác dụng |
| --- | ---: | ---: | --- |
| Hóa Ma Chỉ | 120 | 8 giây | Chỉ kình đỏ theo đường thẳng, xuyên nhiều mục tiêu |
| Đạo Hóa Hoàng Tuyền | 300 | 20 giây | Vòng Hoàng Tuyền tím tại vị trí tung chiêu, 8 đợt sát thương trong 4 giây; làm chậm và giảm 20% phòng ngự |
| Định Thân Thuật | 80 | 12 giây | Khóa mục tiêu đầu tiên theo hướng chỉ; 1 giây trong PK, 2 giây với quái; không gây sát thương |
| Trảm La Quyết | 200 | 15 giây | Lưỡi liềm đỏ đen xuyên nhiều mục tiêu phía trước |
| Địch Linh Ấn | 150 | 10 giây | Chưởng ấn vàng trong vùng nhỏ trước mặt; choáng 0,35 giây trong PK |

Hiệu ứng dùng các khung vẽ riêng cho tích lực, va chạm và tan biến. Phaser và sân PK cùng lấy hình, vùng đánh và dữ liệu kỹ năng từ một bộ cấu hình. Nâng cấp giảm hồi chiêu và tăng uy lực; thiếu MP vẫn có thể gán chiêu, nhưng cần hồi đủ MP mới tung chiêu được. Chiêu riêng không hiện trong danh sách của Lý Mộ Uyển. Bí thuật cũ vẫn ghi rõ yêu cầu cấp và học từ trưởng lão.

AI luyện tay tìm đường vòng quanh đá; di chuyển của người chơi trượt theo mép vật cản. Quái và tán tu dùng A* khi đường thẳng bị chắn, có kiểm tra va chạm toàn thân tại góc tường. Quái không đánh thường xuyên qua tường.

NPC thôn và thành được căn theo phần hình không trong suốt, cao 118 đơn vị, thay vì tính cả khoảng trống của ảnh. Bảng nhân vật bỏ danh sách dài “Trang bị theo phẩm chất”; sáu ô trang bị vẫn hoạt động.

Đan Phòng và lò đan trong động phủ hiện số nguyên liệu đang có/cần, tên và lượng còn thiếu, cùng thông báo luyện/chế thành công ngay trong thẻ công thức. Điều kiện cập nhật khi túi đồ thay đổi.

Nguồn hình: **built-in imagegen**. Các prompt và đường dẫn asset lưu trong [wang-skills-assets.json](wang-skills-assets.json).

Kiểm chứng: kiểm thử sát thương theo hướng, né đòn, định thân, sát thương định kỳ, MP/hồi chiêu, lưu bộ chiêu, đường vòng qua vật cản; kiểm thử bấm giao diện đổi chiêu và chế tạo. Kiểm tra trình duyệt với khung iPhone 390×844 xoay ngang, 844×390 và PC 1366×900. Kiểm tra PK trình duyệt dùng sân luyện offline; không xác nhận kết nối giữa hai tài khoản thật.
