# Check where mysql-service is imported
Write-Host "Checking mysql-service imports..." -ForegroundColor Yellow

# Check in components (should NOT import mysql-service)
Write-Host "`nChecking components folder:" -ForegroundColor Cyan
Get-ChildItem -Path "components" -Recurse -Include *.tsx,*.ts -ErrorAction SilentlyContinue |
    Select-String -Pattern "mysql-service" |
    ForEach-Object {
        Write-Host "  WARNING: $($_.Path)" -ForegroundColor Red
        Write-Host "  Line $($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
    }

# Check in app pages (client components should NOT import)
Write-Host "`nChecking app folder for client components:" -ForegroundColor Cyan
Get-ChildItem -Path "app" -Recurse -Include *.tsx,*.ts -ErrorAction SilentlyContinue |
    Select-String -Pattern "mysql-service" |
    Where-Object { $_.Line -notmatch "use server" } |
    ForEach-Object {
        Write-Host "  Found in: $($_.Path)" -ForegroundColor Yellow
        Write-Host "  Line $($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
    }

Write-Host "`nDone!" -ForegroundColor Green