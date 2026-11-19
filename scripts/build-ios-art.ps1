# The generated artwork is checked in; Mac builds do not need PowerShell.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.Drawing

function Write-OpaqueImage([string]$Source, [string]$RelativeTarget, [int]$Width, [int]$Height) {
  $target = Join-Path $taskRoot $RelativeTarget
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  $inputImage = [System.Drawing.Image]::FromFile((Join-Path $taskRoot $Source))
  # Icons must have no alpha channel, even when every pixel is opaque.
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(7, 21, 34))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $scale = [Math]::Min($Width / $inputImage.Width, $Height / $inputImage.Height)
    $drawWidth = [int][Math]::Round($inputImage.Width * $scale)
    $drawHeight = [int][Math]::Round($inputImage.Height * $scale)
    $rectangle = New-Object System.Drawing.Rectangle(([int](($Width - $drawWidth) / 2)), ([int](($Height - $drawHeight) / 2)), $drawWidth, $drawHeight)
    $graphics.DrawImage($inputImage, $rectangle, 0, 0, $inputImage.Width, $inputImage.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $attributes.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    $inputImage.Dispose()
  }
}

Write-OpaqueImage 'art/android/app-icon.png' 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png' 1024 1024
Write-OpaqueImage 'art/startup/entry-poster.png' 'ios/App/App/Assets.xcassets/Splash.imageset/entry-poster.png' 1280 720
Write-Host 'Generated opaque iOS icon (1024px) and launch poster.'
