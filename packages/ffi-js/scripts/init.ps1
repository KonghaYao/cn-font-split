#!/usr/bin/env pwsh
$script:rust_target = ""
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$VERSION_FILE = "$SCRIPT_DIR\version"
$GH_HOST=$CN_FONT_SPLIT_GH_HOST
if (-not $GH_HOST) {
    $GH_HOST = "https://github.com"
} 
# 定义颜色代码
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"
$PURPLE = "Magenta"
$CYAN = "Cyan"
$NC = "Default" # 没有颜色（重置）

# 定义一个带颜色输出的函数
function colorEcho {
    param (
        [string]$color,
        [string]$message
    )
    Write-Host $message -ForegroundColor $color
}


function matchPlatform {
    param (
        # 无效参数
        [bool]$isMusl
    )

    $platform = (Get-CimInstance Win32_OperatingSystem).Caption
    $arch = (Get-WmiObject -Class Win32_Processor).Architecture

    # 检测编译器环境
    $compiler = "msvc"  # 默认值
    if ($env:CC -match "gcc" -or $env:CXX -match "g++") {
        $compiler = "gnu"
    }
    Write-Host "[Debug] System: $platform $arch $compiler"

    # 根据检测结果加载相应的DLL文件
    if (
        # arm64 
        $arch -eq 12
    ) {
        $global:rust_target = "aarch64-pc-windows-msvc"
    } else {
        if ($compiler -eq "msvc") {
            $global:rust_target = "x86_64-pc-windows-msvc"
        } elseif ($compiler -eq "gnu") {
            $global:rust_target = "x86_64-pc-windows-gnu"
        }
    } 

    if (-not $global:rust_target) {
        $global:rust_target = "x86_64-pc-windows-msvc"
    }
}

matchPlatform -isMusl $false
Write-Host "[Info] $global:rust_target"

function getLatestVersion {
    $response = Invoke-WebRequest -Uri "https://ungh.cc/repos/KonghaYao/cn-font-split/releases/latest" -UseBasicParsing
    $version = ($response.Content | ConvertFrom-Json).release.tag
    return $version
}

function getAllVersion {
    $response = Invoke-WebRequest -Uri "https://ungh.cc/repos/KonghaYao/cn-font-split/releases" -UseBasicParsing
    $versions = ($response.Content | ConvertFrom-Json).releases

    colorEcho $BLUE "All versions: "
    $count = 0
    foreach ($tag in $versions) {
        if ($count -lt 5) {
            colorEcho $GREEN "  $($tag.tag)"
            $count++
        } else {
            break
        }
    }
}
function cn_i {
    $Input = $args[0]
    $p = ""
    $version = ""
    if ($Input -match "@") {
        $p = $Input.Split("@")[0]
        $version = $Input.Split("@")[1]
    } else {
        $p = $Input
    }

    if ($p -eq "default") {
        $p = $global:rust_target
    }

    
    if ($version -eq "") {
        $version = getLatestVersion
    }

    Write-Host "$p@$version"

    $ext = "dll"
    $plat = (Get-CimInstance Win32_OperatingSystem).Caption
    

    $download_url = "$GH_HOST/KonghaYao/cn-font-split/releases/download/$version/libffi-$p.$ext"
    Write-Host $download_url

    Invoke-WebRequest -Uri $download_url -OutFile "$SCRIPT_DIR\libffi-$p.$ext"

    if (Test-Path $VERSION_FILE) {
        ((Get-Content -Path $VERSION_FILE -Raw) -split "`n" | Where-Object { $_ -notmatch "^$p" } | Where-Object { $_.Trim() -ne ""}) -join "`n" | Set-Content $VERSION_FILE
        Add-Content -Path $VERSION_FILE -Value "$p@$version"
    } else {
        Add-Content -Path $VERSION_FILE -Value "$p@$version"
    }
}

function cn_ls {
    if (Test-Path $VERSION_FILE) {
        Write-Host "`nYour cn-font-split core version: "
        (Get-Content -Path $VERSION_FILE -Raw) -split "`n" | ForEach-Object {
            Write-Host "  $_" -ForegroundColor $GREEN
        }
    } else {
        colorEcho $RED "version 文件不存在; cn-font-cli i default`n"
    }
    getAllVersion

    Write-Host "`nuse cn-font-split i to install"
}

switch ($args[0]) {
    "i" {
        cn_i $args[1]
    }
    "ls" {
        cn_ls
    }
    default {
        Write-Host "Usage: cn-font-cli i default or cn-font-cli ls"
        exit 1
    }
}
