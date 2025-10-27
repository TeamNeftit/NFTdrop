@echo off
REM NEFTIT NFT DROP - Production Deployment Script (Windows)
REM This script prepares your project for production deployment

echo.
echo ========================================
echo NEFTIT NFT DROP - Production Deployment
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please copy .env.example to .env and fill in your production values
    echo.
    echo Run: copy .env.example .env
    echo Then edit .env with your production credentials
    echo.
    pause
    exit /b 1
)

echo [OK] .env file found
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)
echo.

REM Build frontend
echo Building frontend for production...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo [OK] Frontend built successfully
echo.

REM Check if dist folder was created
if not exist dist (
    echo ERROR: dist folder not created
    pause
    exit /b 1
)

echo [OK] dist folder created
echo.

echo ========================================
echo Build Information:
echo    - Output directory: dist/
echo    - Minification: Enabled (Terser)
echo    - Console logs: Removed
echo    - Source maps: Included
echo ========================================
echo.

echo Production build complete!
echo.
echo Next Steps:
echo    1. Deploy /dist folder to your frontend hosting (Vercel/Netlify)
echo    2. Deploy backend to your server (Railway/Render/Heroku)
echo    3. Set all environment variables on your hosting platform
echo    4. Update OAuth callback URLs in X and Discord portals
echo    5. Test all features thoroughly
echo.
echo See DEPLOYMENT_GUIDE.md for detailed instructions
echo.
echo Ready for production deployment!
echo.
pause
