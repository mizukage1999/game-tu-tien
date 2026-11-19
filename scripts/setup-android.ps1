param([switch]$AcceptSdkLicense)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$taskRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $taskRoot '.android-tools'
$sdkRoot = Join-Path $toolRoot 'sdk'
New-Item -ItemType Directory -Force -Path $toolRoot, $sdkRoot | Out-Null

function Get-VerifiedZip($Uri, $Target, $Sha256) {
  if (!(Test-Path -LiteralPath $Target) -or (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash -ne $Sha256) {
    Write-Host "Downloading $(Split-Path -Leaf $Target)"
    Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $Target
  }
  if ((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash -ne $Sha256) { throw "Checksum mismatch: $Target" }
}

$jdk = Get-ChildItem -LiteralPath $toolRoot -Directory -Filter 'jdk-21*' | Select-Object -First 1
if (!$jdk) {
  $release = Invoke-RestMethod -Uri 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
  $package = $release[0].binary.package
  $jdkZip = Join-Path $toolRoot 'jdk21.zip'
  Get-VerifiedZip $package.link $jdkZip $package.checksum
  & tar.exe -xf $jdkZip -C $toolRoot
  if ($LASTEXITCODE -ne 0) { throw 'JDK extraction failed' }
  $jdk = Get-ChildItem -LiteralPath $toolRoot -Directory -Filter 'jdk-21*' | Select-Object -First 1
}
if (!$jdk) { throw 'JDK 21 not found' }
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:ANDROID_USER_HOME = Join-Path $toolRoot 'user'
$env:GRADLE_USER_HOME = Join-Path $toolRoot 'gradle'
$env:PATH = "$($jdk.FullName)\bin;$env:PATH"

$manager = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
if (!(Test-Path -LiteralPath $manager)) {
  if (!$AcceptSdkLicense) { throw 'Run with -AcceptSdkLicense only after accepting https://developer.android.com/studio#terms' }
  $sdkZip = Join-Path $toolRoot 'commandlinetools.zip'
  Get-VerifiedZip 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' $sdkZip '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
  $extractRoot = Join-Path $toolRoot 'commandline-extract'
  New-Item -ItemType Directory -Force -Path $extractRoot, (Join-Path $sdkRoot 'cmdline-tools') | Out-Null
  & tar.exe -xf $sdkZip -C $extractRoot
  if ($LASTEXITCODE -ne 0) { throw 'SDK extraction failed' }
  Move-Item -LiteralPath (Join-Path $extractRoot 'cmdline-tools') -Destination (Join-Path $sdkRoot 'cmdline-tools\latest')
}
$ErrorActionPreference = 'Continue' # Java tools use stderr for non-fatal warnings.
if ($AcceptSdkLicense) {
  # This switch is explicit consent; ordinary APK builds never accept new terms.
  (1..40 | ForEach-Object { 'y' }) | & $manager "--sdk_root=$sdkRoot" --licenses
  if ($LASTEXITCODE -ne 0) { throw 'SDK license acceptance failed' }
}
& $manager "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'SDK package installation failed' }
$ErrorActionPreference = 'Stop'
Write-Host 'Portable Android toolchain ready. No system environment variables changed.'
