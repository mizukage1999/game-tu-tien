$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$toolRoot = Join-Path $taskRoot '.android-tools'
if (!$env:JAVA_HOME) {
  $jdk = Get-ChildItem -LiteralPath $toolRoot -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
if (!$env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $toolRoot 'sdk' }
if (!(Test-Path -LiteralPath "$env:JAVA_HOME\bin\java.exe") -or !(Test-Path -LiteralPath "$env:ANDROID_HOME\platforms\android-36\android.jar")) {
  throw 'JDK 21 / Android SDK 36 required. See docs/android-apk.md and scripts/setup-android.ps1.'
}
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ANDROID_USER_HOME = Join-Path $toolRoot 'user'
$env:GRADLE_USER_HOME = Join-Path $toolRoot 'gradle'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
$key = Join-Path $toolRoot 'debug.keystore'
if (!(Test-Path -LiteralPath $key)) {
  $ErrorActionPreference = 'Continue'
  & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $key -storepass android -keypass android -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000
  if ($LASTEXITCODE -ne 0) { throw 'Debug key generation failed' }
  $ErrorActionPreference = 'Stop'
}
$ErrorActionPreference = 'Continue' # Native build tools also log warnings to stderr.
& npm.cmd run android:sync
if ($LASTEXITCODE -ne 0) { throw 'Android web build / sync failed' }
$sdkPath = $env:ANDROID_HOME.Replace('\', '/')
[System.IO.File]::WriteAllText((Join-Path $taskRoot 'android/local.properties'), "sdk.dir=$sdkPath`n")
& "$taskRoot\android\gradlew.bat" -p "$taskRoot\android" assembleDebug --no-daemon --max-workers=2 --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Gradle APK build failed' }
$output = Join-Path $taskRoot 'artifacts/android'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$apk = Join-Path $output 'cuu-huyen-debug.apk'
Copy-Item -LiteralPath "$taskRoot\android\app\build\outputs\apk\debug\app-debug.apk" -Destination $apk -Force
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --verbose $apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
$sha = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText((Join-Path $output 'cuu-huyen-debug.apk.sha256'), "$sha  cuu-huyen-debug.apk`n")
Write-Host "APK ready: $apk"
Write-Host "Size: $([math]::Round((Get-Item -LiteralPath $apk).Length / 1MB, 2)) MiB"
