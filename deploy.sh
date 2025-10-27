#!/bin/bash

# NEFTIT NFT DROP - Production Deployment Script
# This script prepares your project for production deployment

echo "🚀 NEFTIT NFT DROP - Production Deployment"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "📝 Please copy .env.example to .env and fill in your production values"
    echo ""
    echo "Run: cp .env.example .env"
    echo "Then edit .env with your production credentials"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: npm install failed"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Build frontend
echo "🏗️  Building frontend for production..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Build failed"
    exit 1
fi
echo "✅ Frontend built successfully"
echo ""

# Check if dist folder was created
if [ ! -d dist ]; then
    echo "❌ ERROR: dist folder not created"
    exit 1
fi

echo "✅ dist folder created"
echo ""

# Display build info
echo "📊 Build Information:"
echo "   - Output directory: dist/"
echo "   - Minification: Enabled (Terser)"
echo "   - Console logs: Removed"
echo "   - Source maps: Included"
echo ""

echo "🎉 Production build complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Deploy /dist folder to your frontend hosting (Vercel/Netlify)"
echo "   2. Deploy backend to your server (Railway/Render/Heroku)"
echo "   3. Set all environment variables on your hosting platform"
echo "   4. Update OAuth callback URLs in X and Discord portals"
echo "   5. Test all features thoroughly"
echo ""
echo "📖 See DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo "✅ Ready for production deployment!"
