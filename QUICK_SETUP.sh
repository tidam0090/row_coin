#!/bin/bash
# Quick Start Guide - Copy & Paste These Commands
# Run these commands to get your app secure and running

echo "🚀 Coin Row Security Setup - Quick Start"
echo "========================================"
echo ""

# Step 1: Generate secrets
echo "Step 1: Generating secure secrets..."
bash setup_secrets.sh

echo ""
echo "Step 2: Update docker-compose.yml"
echo "   Edit: docker-compose.yml"
echo "   Change: POSTGRES_PASSWORD: coinrow"
echo "   To: POSTGRES_PASSWORD: <use the DB_PASSWORD from setup_secrets.sh>"
echo ""
read -p "Press Enter after updating docker-compose.yml..."

echo ""
echo "Step 3: Installing dependencies..."
cd backend
npm install
cd ../frontend
npm install

echo ""
echo "Step 4: Running database migrations..."
cd ../backend
npm run migrate

echo ""
echo "Step 5: Building the application..."
npm run build
cd ../frontend
npm run build

echo ""
echo "✅ Setup Complete!"
echo ""
echo "To test locally:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:5173"
echo ""
echo "📚 Read the security guides:"
echo "  1. README_SECURITY_FIXES.md - Overview (5 min)"
echo "  2. QUICK_START.md - Quick reference (5 min)"
echo "  3. WHAT_TO_DO.md - What you need to do (10 min)"
echo ""
echo "🚀 Ready to deploy? See SECURITY_DEPLOYMENT.md"
