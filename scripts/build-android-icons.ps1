param([string]$Source = 'art/android/app-icon.png')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
if (![System.IO.Path]::IsPathRooted($Source)) { $Source = Join-Path $taskRoot $Source }
if (!(Test-Path -LiteralPath $Source -PathType Leaf)) {
  throw "Save the original app icon to art/android/app-icon.png, or pass -Source with its path. Missing: $Source"
}
Add-Type -AssemblyName System.Drawing
$inputImage = [System.Drawing.Image]::FromFile($Source)
$resourceRoot = Join-Path $taskRoot 'android/app/src/main/res'

function Write-LauncherImage([string]$RelativePath, [int]$Size, [int]$ArtworkSize, [bool]$Transparent) {
  $target = Join-Path $resourceRoot $RelativePath
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  try {
    if ($Transparent) { $graphics.Clear([System.Drawing.Color]::Transparent) }
    else { $graphics.Clear([System.Drawing.Color]::FromArgb(7, 21, 34)) }
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    # Preserve the entire original artwork; never stretch or crop the face/title.
    $scale = [Math]::Min($ArtworkSize / $inputImage.Width, $ArtworkSize / $inputImage.Height)
    $width = [int][Math]::Round($inputImage.Width * $scale)
    $height = [int][Math]::Round($inputImage.Height * $scale)
    $x = [int][Math]::Floor(($Size - $width) / 2)
    $y = [int][Math]::Floor(($Size - $height) / 2)
    $rectangle = New-Object System.Drawing.Rectangle($x, $y, $width, $height)
    $graphics.DrawImage($inputImage, $rectangle, 0, 0, $inputImage.Width, $inputImage.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $attributes.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

try {
  foreach ($density in @(
    @{ Name='mdpi'; Size=48 }, @{ Name='hdpi'; Size=72 }, @{ Name='xhdpi'; Size=96 },
    @{ Name='xxhdpi'; Size=144 }, @{ Name='xxxhdpi'; Size=192 }
  )) {
    Write-LauncherImage "mipmap-$($density.Name)/cuuhuyen_launcher.png" $density.Size $density.Size $false
  }
  # Android's adaptive foreground canvas is 108dp; its safe artwork zone is 66dp.
  Write-LauncherImage 'drawable-xxxhdpi/cuuhuyen_launcher_foreground.png' 432 264 $true
} finally { $inputImage.Dispose() }

$adaptiveFolder = Join-Path $resourceRoot 'mipmap-anydpi-v26'
New-Item -ItemType Directory -Force -Path $adaptiveFolder | Out-Null
$adaptiveXml = @'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/cuuhuyen_launcher_background" />
    <foreground android:drawable="@drawable/cuuhuyen_launcher_foreground" />
</adaptive-icon>
'@
[System.IO.File]::WriteAllText((Join-Path $adaptiveFolder 'cuuhuyen_launcher.xml'), $adaptiveXml + "`n")
$colorXml = @'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="cuuhuyen_launcher_background">#071522</color>
</resources>
'@
[System.IO.File]::WriteAllText((Join-Path $resourceRoot 'values/launcher-colors.xml'), $colorXml + "`n")
Write-Host "Generated 5 launcher densities and adaptive icon from: $Source"
