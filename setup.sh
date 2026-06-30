#!/bin/bash
echo "========================================="
echo "  TourneyPro - Setup Script"
echo "========================================="

echo ""
echo "1. Installing backend dependencies..."
cd backend && npm install
if [ $? -ne 0 ]; then echo "❌ Backend install failed"; exit 1; fi

echo ""
echo "2. Installing frontend dependencies..."
cd ../frontend && npm install
if [ $? -ne 0 ]; then echo "❌ Frontend install failed"; exit 1; fi

echo ""
echo "========================================="
echo "  ✅ Setup Complete!"
echo "========================================="
echo ""
echo "To start the app:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm start"
echo ""
echo "  Open: http://localhost:3000"
echo ""
echo "  Admin Code: ADMIN2024"
echo "========================================="
