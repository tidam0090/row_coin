#!/bin/bash
# Setup script to generate secrets and prepare for deployment
# Usage: bash setup_secrets.sh

set -e

echo "🔐 Coin Row Security Setup"
echo "========================="
echo ""

# Generate secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

echo "✅ Generated secrets:"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "ADMIN_KEY=$ADMIN_KEY"
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""

# Check if .env exists
if [ -f "backend/.env" ]; then
    echo "⚠️  backend/.env already exists"
    echo "   Not overwriting - update manually or delete and re-run"
else
    cat > backend/.env << EOF
# Database
DATABASE_URL=postgres://coinrow:$DB_PASSWORD@localhost:5432/coinrow

# Server
PORT=4000
NODE_ENV=development

# Security (32+ character random strings)
JWT_SECRET=$JWT_SECRET
ADMIN_KEY=$ADMIN_KEY

# CORS (comma-separated, no wildcards!)
CORS_ORIGIN=http://localhost:5173

# Optional
LOG_LEVEL=info
EOF
    echo "✅ Created backend/.env"
fi

if [ -f "frontend/.env" ]; then
    echo "⚠️  frontend/.env already exists"
else
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:4000/api
EOF
    echo "✅ Created frontend/.env"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Review backend/.env and update DATABASE_URL if needed"
echo "   2. Update docker-compose.yml with DB_PASSWORD"
echo "   3. Run: npm install (in both backend and frontend)"
echo "   4. Run: npm run migrate (in backend)"
echo "   5. Run: npm run dev"
echo ""
echo "🚀 For production:"
echo "   1. Copy backend/.env to backend/.env.production"
echo "   2. Update DATABASE_URL to production database"
echo "   3. Set CORS_ORIGIN to your domain"
echo "   4. Set NODE_ENV=production"
echo "   5. Never commit .env files to git!"
