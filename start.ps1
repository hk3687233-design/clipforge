$env:Path = "C:\Users\Abdul Hannan\AppData\Local\Programs\Python\Python314;C:\Users\Abdul Hannan\AppData\Local\Programs\Python\Python314\Scripts;C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin;C:\Redis;C:\Program Files\nodejs;$env:Path"

Write-Host "Starting ClipForge..." -ForegroundColor Magenta

# Kill any old instances
Get-Process | Where-Object { $_.Name -eq "python" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# FastAPI
Start-Process powershell -ArgumentList "-NoExit", "-Title", "ClipForge - API", "-Command", "
`$env:Path = 'C:\Users\Abdul Hannan\AppData\Local\Programs\Python\Python314;C:\Users\Abdul Hannan\AppData\Local\Programs\Python\Python314\Scripts;C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin;C:\Redis;' + `$env:Path
Set-Location 'F:\Claude\clipforge\backend'
Write-Host 'FastAPI on http://localhost:8000' -ForegroundColor Cyan
.\venv\Scripts\uvicorn.exe main:app --reload --port 8000
"

Start-Sleep -Seconds 8

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Title", "ClipForge - Frontend", "-Command", "
`$env:Path = 'C:\Program Files\nodejs;' + `$env:Path
Set-Location 'F:\Claude\clipforge\frontend'
`$env:NEXT_PUBLIC_API_URL = 'http://localhost:8000'
Write-Host 'Next.js on http://localhost:3000' -ForegroundColor Green
npm run dev -- --port 3000
"

Start-Sleep -Seconds 12
Start-Process "http://localhost:3000"
Write-Host "All done! Opening browser..." -ForegroundColor Magenta
