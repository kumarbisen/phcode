# Script to download Alpine Linux Rootfs and PRoot binary
$assetsDir = ".\android\app\src\main\assets"

if (!(Test-Path -Path $assetsDir)) {
    New-Item -ItemType Directory -Force -Path $assetsDir
}

Write-Host "Downloading Alpine Linux Mini Rootfs (aarch64)..."
$alpineUrl = "https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/aarch64/alpine-minirootfs-3.20.2-aarch64.tar.gz"
$alpineDest = Join-Path -Path $assetsDir -ChildPath "alpine-rootfs.tar.gz"
Invoke-WebRequest -Uri $alpineUrl -OutFile $alpineDest

Write-Host "Please note: Downloading a statically compiled 'proot' for Android automatically is difficult due to varying sources."
Write-Host "You must manually download a 'proot' static binary for Android (aarch64) and place it at:"
Write-Host "$assetsDir\proot"
Write-Host "You can find one in the Termux packages repository or compile it using https://github.com/green-green-avk/build-proot-android"
