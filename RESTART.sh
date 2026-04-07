#!/bin/bash

# ========================================
# HORIZON AI - QUICK RESTART SCRIPT
# ========================================
# This script will:
# 1. Kill all Node processes
# 2. Clean install dependencies
# 3. Start development server
# ========================================

echo ""
echo "============================================"
echo "   HORIZON AI - QUICK RESTART"
echo "============================================"
echo ""

# Kill existing processes
echo "[1/4] Killing existing processes..."
npx kill-port 3000 3004 5173 2>/dev/null
sleep 2

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "[2/4] Removing node_modules..."
    rm -rf node_modules
    sleep 1
fi

# Check if package-lock.json exists
if [ -f "package-lock.json" ]; then
    echo "[3/4] Removing package-lock.json..."
    rm package-lock.json
fi

# Reinstall dependencies
echo "[4/4] Installing dependencies (this may take 2-3 minutes)..."
npm install

# Start development
echo ""
echo "============================================"
echo "   STARTING DEVELOPMENT SERVER"
echo "============================================"
echo ""
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3004"
echo ""
echo "   Watch for both to start before opening browser!"
echo "============================================"
echo ""

npm run dev
