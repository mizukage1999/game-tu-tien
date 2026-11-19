# iOS — Cửu Huyền

Đã thêm project `ios/App/App.xcodeproj` bằng Capacitor 8.6.2, cùng phiên bản
runtime với Android. Bundle ID: `com.cuuhuyen.game`; phiên bản iOS đầu tiên:
`1.0.0`, build `1`. Hỗ trợ iPhone/iPad chạy iOS 15 trở lên.

## Đã chuẩn bị

- Màn hình ngang hai chiều, ẩn status bar, tự ẩn home indicator khi chơi.
- Dùng icon Cửu Huyền đã chọn cho Android, xuất 1024×1024 RGB không alpha.
- Launch screen dùng ảnh ngự kiếm; sau đó màn tải HTML báo tiến độ tải tài nguyên
  thật. Không có video hay thời gian chờ 15 giây.
- Tài nguyên nằm trong app; giữ WebP đã tối ưu và bỏ bản ảnh nguồn trùng lặp.
  Vẫn cần mạng cho đăng nhập, save cloud và chơi online.
- Lưu game và thả điều khiển khi app chuyển nền; cập nhật bố cục khi quay lại.
  Giữ màn hình sáng khi app đang hoạt động.
- Bản native không chứa dashboard `/admin`.

## Kiểm tra và đồng bộ trên Windows

```powershell
npm ci
npm run ios:sync
npm run ios:verify
```

`ios:sync` build production vào `dist-ios`, rồi copy vào `ios/App/App/public`.
Script chọn đúng config iOS; hãy dùng lệnh này thay cho `npx cap sync` chung cả
hai nền tảng. Android tiếp tục dùng `npm run android:sync`.

Các file web đã build, config đã copy và cache Xcode được gitignore; commit
project Xcode, source, artwork và lockfile, rồi chạy sync lại trên máy build.
Ảnh icon/launch đã được tạo và nằm trong project. Khi thay artwork, có thể tạo
lại trên Windows bằng `powershell -File scripts/build-ios-art.ps1`.

Windows chưa thể biên dịch Swift, chạy iOS Simulator hoặc ký/xuất IPA bằng
Xcode. Build/sync web thành công không đồng nghĩa đã chạy thử trên iPhone.

## Chưa có Mac: build bằng GitHub Actions

Workflow `.github/workflows/ios-build.yml` chỉ chạy khi bấm **Run workflow**;
không tự chạy mỗi lần push và chưa được kích hoạt từ workspace này.

1. Đưa thay đổi lên repository GitHub.
2. Vào **Settings → Secrets and variables → Actions → Variables**, thêm
   `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` của game. Đây là URL và public
   anon/publishable key đang dùng cho client; không dùng key `service_role`.
   Workflow không lấy `.env.local` từ máy Windows.
3. Vào **Actions → iOS build (manual, unsigned) → Run workflow**.
4. Chọn `simulator` để kiểm tra build cho Simulator, hoặc `archive` để tạo
   archive cho thiết bị thật. Workflow dùng runner macOS 15 và Xcode 26.3.
5. Nếu build thành công, tải kết quả trong **Artifacts** của lượt chạy.

Kết quả `CuuHuyen-simulator.zip` chứa app cho máy giả lập trên Mac.
`CuuHuyen-unsigned.xcarchive.zip` chứa archive **chưa ký** cho iPhone/iPad.
Cả hai đều chưa phải file cài trực tiếp lên iPhone. Để phân phối qua TestFlight,
cần Apple Developer Program, app trong App Store Connect và signing phù hợp.
Workflow hiện không lưu chứng chỉ, không tạo IPA giả bằng cách đổi đuôi zip,
không tự upload lên TestFlight/App Store. GitHub có thể tính phút build macOS
theo gói của repository.

## Khi có Mac hoặc người hỗ trợ ký app

Cần Node 22+, Xcode 26+ và Xcode Command Line Tools. Project dùng Swift Package
Manager; không cần cài CocoaPods.

```sh
npm ci
# Đặt cùng cấu hình public Supabase qua .env.local hoặc biến môi trường.
npm run ios:sync
npm run ios:open
```

Trong Xcode, chọn target **App → Signing & Capabilities**, chọn Development Team
của bạn. Giữ bundle ID hiện tại nếu team đã đăng ký ID đó, hoặc cập nhật sang ID
team sở hữu trong cả `capacitor.config.ts` và target Xcode. Chọn iPhone đã kết
nối rồi Run để kiểm tra; chọn **Any iOS Device → Product → Archive → Distribute
App** để ký và phân phối bằng phương thức tài khoản hỗ trợ.

Có thể build không ký bằng terminal:

```sh
npm run ios:simulator
npm run ios:archive
```

Output nằm ở `artifacts/ios/`. Hai lệnh này kiểm tra Xcode 26+, build/sync game,
kiểm tra project rồi chạy `xcodebuild` với `CODE_SIGNING_ALLOWED=NO`. Archive cần
được ký bằng cấu hình Apple phù hợp trước khi cài lên thiết bị.

## Đã kiểm tra tại workspace Windows

- Production build iOS và Capacitor sync thành công; App plugin được đăng ký.
- 20 test qua: lifecycle Android/iOS, App và màn tải tài nguyên.
- Icon đúng 1024×1024 RGB; Info.plist chỉ hỗ trợ ngang; poster có trong app.
- Bộ tài nguyên delivery: 561 file / 143.61 MiB; bỏ 284.62 MiB ảnh nguồn trùng.
- Build production web và Android vẫn thành công; ESLint các file thay đổi đã qua.
- Chưa biên dịch project bằng Xcode, chưa chạy workflow cloud hoặc thử iPhone thật.

Nguồn: [yêu cầu môi trường Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup),
[Swift Package Manager](https://capacitorjs.com/docs/ios/spm),
[TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
