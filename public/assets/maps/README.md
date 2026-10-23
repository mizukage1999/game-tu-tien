# Kiến trúc sân tông môn

## Sơn hà và chương Thiết Trụ

| Tệp | Nội dung |
| --- | --- |
| `world-sect.png` | Chính điện, đình, sơn môn, tường, cầu đá và đào cổ |
| `world-nature.png` | Cổ thụ, thác nước, cửa động, đá rêu, tinh thể, hàng rào |
| `world-village.png` | Nhà làng, giếng, bàn mộc, liễu, luống rau, miếu |
| `thiet-tru.png` | 4 frame đứng và 4 frame đi của Thiết Trụ nhỏ tuổi |
| `world-people.png` | Cha, mẹ, Dược Bà, Tiên Sinh, trưởng thôn và người giữ suối |

Tạo bằng imagegen tích hợp dựa trên ba ảnh tham chiếu của người dùng; giữ alpha gốc. Prompt cuối lưu tại `world-prompts.txt`. Các frame kiến trúc được cắt lúc tải trong `src/game/art/world.ts`; sprite Thiết Trụ được đóng gói lại theo rig 136 px khi tải game.

Các NPC dân làng có atlas riêng `world-people.png`, prompt tại `people-prompt.txt`. Chân dung hội thoại được lấy từ cùng sprite để giữ đúng nhận diện.

`courtyard-architecture.png` là atlas PNG có alpha, gồm chín vật thể: cột, cột treo cờ, đèn lồng, trụ đá, lan can, cờ đứng, bảng nhiệm vụ, bồn hoa và lư hương.

Tạo bằng công cụ imagegen tích hợp, dựa trên ảnh tham chiếu người dùng gửi. Vùng sprite và tỉ lệ hiển thị nằm trong `src/game/art/courtyard.ts`; giữ nguyên ảnh nguồn, cắt frame lúc tải vào Phaser.

Prompt cuối được lưu trong `courtyard-prompt.txt` cạnh ảnh này.
