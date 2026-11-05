# Đo luồng chơi trên production build — 05/11/2026

## Phạm vi đo

- Commit ứng dụng: e03c786. Vite production minify, React production, entry/import graph gốc; chỉ chèn hook ghi thời gian trong bản đo riêng. Không dùng npm run dev để lấy số này.
- Chrome headless trên Windows, PC 1280×720, GPU thật Intel HD Graphics 620 qua ANGLE Direct3D11, CPU không giảm tốc. Mạng mô phỏng 12 Mbps/40 ms, JS/CSS được gzip.
- Bản build chạy tại máy, backend offline cách ly. Không đăng nhập, tạo tài khoản hoặc cấp quà trên server thật. Chưa có URL/tài khoản test của website đã deploy.
- Hai lượt cache lạnh và hai lượt cache nóng cho vào game. Một lượt làm đủ 10 nhiệm vụ, mở đủ 18 menu và đi qua các cổng map. Tự chạy theo đường và tương tác thật; không dịch chuyển nhân vật hoặc gán hoàn thành nhiệm vụ. Không tính thời gian người chơi đọc thoại; có chờ giữa thao tác tương tác để đúng cooldown.
- Thời gian hiển thị menu dùng sự kiện chuột → DOM và hai lượt requestAnimationFrame. Hai lượt RAF là chỉ dấu cơ hội dựng khung hình, không chứng minh mọi pixel/ảnh đã hiện xong.

## Vào game

| Bước | Cache lạnh (2 lượt) | Cache nóng (2 lượt) |
| --- | ---: | ---: |
| Mở trang → màn chọn nhân vật và renderer sẵn | 2.27–3.33 s | 1.34–1.45 s |
| Bấm tạo/vào game → làng sẵn + hai lượt RAF | 6.07–7.36 s | 2.14–2.25 s |

Tên được nhập ngay khi màn chọn xuất hiện, không cố tình chờ tải trước toàn bộ asset. Số tạo nhân vật ở đây **chưa bao gồm RPC giữ tên trên Supabase**. Lượt lạnh đầy đủ có createWorld khoảng 1.305 s, cho thấy ngoài tải mạng còn có việc đồng bộ trên main thread.

## Chuỗi nhiệm vụ nhập môn

Tổng 85.77 s (~1 phút 26 giây), gồm đi bộ, tương tác, chuyển sang Ngoại Môn và trả nhiệm vụ. Tốc độ thao tác tự động nhanh hơn người chơi đọc cốt truyện.

| Nhiệm vụ | Thời gian | Tác vụ main thread dài nhất >50 ms |
| --- | ---: | ---: |
| Sớm Mai Vương Gia | 4.32 s | Không có |
| Hai Gàu Nước Giếng | 7.84 s | Không có |
| Tiếng Đục Dưới Hiên | 2.88 s | Không có |
| Mùi Thuốc Quen Thuộc | 3.94 s | Không có |
| Dưới Bóng Liễu Già | 10.15 s | Không có |
| Một Chữ Tiên | 13.93 s | Không có |
| Lời Dặn Trước Ngày Đi | 8.58 s | Không có |
| Qua Khỏi Lũy Tre | 25.06 s | 3057 ms |
| Tĩnh Tâm Trước Sơn Môn | 4.75 s | 87 ms |
| Bước Đầu Nhập Đạo | 4.21 s | 98 ms |

Sáu bước đầu và bước từ biệt cha mẹ không có long task >50 ms. Chậm nhất là lần đầu rời làng do tải/dựng map mới. Khi hoàn thành nhập môn không ghi nhận assets-loading mới; ngoại hình trưởng thành đổi trên scene đang có.

## Nhận thưởng cấp 99

Áp dụng snapshot cấp 99 qua hàm applyReceipt thật, cập nhật HUD và hai lượt RAF: **0.27 s**. Đây là fixture local, **không phải tổng thời gian nhận thư online**. Luồng online còn tuần tự đọc inbox, flush save và gọi claim RPC; cần tài khoản test để đo riêng phần này. Không dùng gán trực tiếp level để thay cho hàm áp dụng receipt.

## Top menu sau cấp 99

| Menu | Chuột → DOM | Chuột → hai lượt RAF |
| --- | ---: | ---: |
| character | 15.6 ms | 255.9 ms |
| bag | 29.2 ms | 195.7 ms |
| cultivate | 115.6 ms | 240.1 ms |
| journey | 117.3 ms | 351.9 ms |
| skills | 11.7 ms | 561.4 ms |
| mail | 2.4 ms | 49.7 ms |
| quests | 4.7 ms | 251.1 ms |
| social | 4.6 ms | 119.7 ms |
| sect | 5.8 ms | 47.7 ms |
| premium | 5 ms | 55.4 ms |
| shop | 6.6 ms | 109.3 ms |
| dungeon | 15.8 ms | 72.4 ms |
| boss | 2.5 ms | 25.5 ms |
| companions | 9.4 ms | 60.8 ms |
| ranking | 14.9 ms | 64.4 ms |
| ranked | 2.5 ms | 34.4 ms |
| activities | 4.6 ms | 68.2 ms |
| settings | 8.8 ms | 80.4 ms |

Săn Boss hiện cửa sổ trước rồi bổ sung danh sách khi loader hoàn tất; số trong bảng chỉ tính phản hồi cửa sổ. Một số menu vẫn có long task khi dựng nội dung. Không có lỗi JavaScript hoặc request tài nguyên thất bại trong lượt đầy đủ.

## Đi qua map

| Lộ trình | Đi bộ + tải | Riêng từ bắt đầu loading → assets-ready | Long task lớn nhất |
| --- | ---: | ---: | ---: |
| Vương Gia Thôn → Ngoại Môn | 25.06 s | 12.05 s | 3057 ms |
| Đến Đại Thừa Viện | 19.91 s | 13.40 s | 3290 ms |
| Đại Thừa Viện → Linh Sơn Tông | 11.57 s | 0.85 s | 574 ms |
| Linh Sơn Tông → Đình Tạ | 7.69 s | 0.80 s | 428 ms |
| Đình Tạ → Linh Sơn Tông → Đại Thừa Viện | 16.62 s | 0.72 + 0.93 s | 561 ms |

Hai tín hiệu assets-loading trong cùng một lần chuyển map được gộp thành một khoảng, tránh cộng hai lần. Không lấy tổng thời gian đi bộ làm thời gian loading. Lần đầu đến Đại Thừa Viện phát sinh khoảng 12.20 MB dữ liệu giao tải trong giai đoạn này; các lần đến Linh Sơn Tông/Đình Tạ sau đó không phát sinh request mới trong lượt đo này.

## Việc nên tối ưu tiếp

1. **Tải asset ở các map sau làng:** lần đầu sang Ngoại Môn và Đại Thừa Viện còn tải/dựng kéo dài. Thu hẹp nhóm ảnh theo NPC, quái và chiêu thật sự cần; cân nhắc tải trước map kế tiếp theo nhiệm vụ với ưu tiên thấp, không cản tương tác hiện tại.
2. **Dựng nền map lúc runtime:** buildTerrain Đại Thừa Viện chiếm khoảng 1.612 s trong lần đầu, createWorld khoảng 2.908 s. Nên đóng gói nền các map này thành các trang nhỏ ở build time như Vương Gia Thôn. Khi quay lại map, cân nhắc cache có giới hạn để tránh dựng nền lại 0.3–0.5 s.
3. **Phần còn lại của createWorld:** làng mất khoảng 1.305 s nhưng buildTerrain chỉ khoảng 13 ms. Cần profile sâu finishMapAssets/publishWorldPreview và khởi tạo đối tượng để xác định phần còn lại; chưa kết luận một hàm cụ thể là nguyên nhân khi chưa đo riêng.
4. **Menu Tu Luyện/Tiên Lộ và lần mở đầu tiên:** phản hồi đã nhanh hơn tải map nhưng vẫn có lần dựng nội dung hơn 100 ms. Có thể cache dữ liệu thuần, tách nội dung chưa nhìn thấy và chuẩn bị ảnh trong thời gian nhàn rỗi.
5. **Nhận quà online:** đo server/inbox/save/claim trước khi tối ưu. Không bỏ bước bảo vệ nhận thưởng trùng để làm nhanh giả tạo.

Đây là số đo trên một PC, không phải cam kết FPS hoặc độ trễ trên Redmi/iPhone. Chưa sửa gameplay hay triển khai các tối ưu mới theo báo cáo này. Dữ liệu tổng hợp và từng khoảng đo nằm trong production-performance-2026-11-05.json.
