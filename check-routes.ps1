# Script để tìm và liệt kê tất cả route handlers cần sửa
# Chạy trong PowerShell

Write-Host "Đang tìm tất cả file route.ts..." -ForegroundColor Green

# Tìm tất cả file route.ts
$routeFiles = Get-ChildItem -Path "app/api" -Recurse -Name "route.ts" -ErrorAction SilentlyContinue

if ($routeFiles) {
    Write-Host "Các file route được tìm thấy:" -ForegroundColor Yellow
    foreach ($file in $routeFiles) {
        Write-Host "  - app/api/$file" -ForegroundColor Cyan
    }
    
    Write-Host "`nKiểm tra nội dung các file để xem cái nào cần sửa..." -ForegroundColor Green
    
    foreach ($file in $routeFiles) {
        $fullPath = "app/api/$file"
        if (Test-Path $fullPath) {
            $content = Get-Content $fullPath -Raw
            # Kiểm tra pattern cũ
            if ($content -match '\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]+\}\s*\}') {
                Write-Host "❌ Cần sửa: $fullPath" -ForegroundColor Red
            } else {
                Write-Host "✅ Đã đúng: $fullPath" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "Không tìm thấy file route.ts nào" -ForegroundColor Yellow
}