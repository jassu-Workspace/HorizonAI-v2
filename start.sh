#!/bin/bash
# Final Horizon AI - Production Server Startup Script
# This script ensures clean startup and port management

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Final Horizon AI - Production Server Startup          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Step 1: Check Node.js version
echo -e "${YELLOW}Step 1: Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"

# Step 2: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
    npm install --prefer-offline --no-audit
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}Step 2: Dependencies already installed${NC}"
fi

# Step 3: Check environment file
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "Please copy .env.example to .env.local and configure it"
    exit 1
fi
echo -e "${GREEN}✅ Configuration file found${NC}"

# Step 4: Kill any existing processes on dev ports
echo -e "${YELLOW}Step 3: Cleaning up existing processes...${NC}"
for port in 3000 3001 3002 3003 3004 3005; do
    lsof -i :$port -sTCP:LISTEN -t >/dev/null 2>&1 && {
        kill -9 $(lsof -i :$port -sTCP:LISTEN -t) 2>/dev/null || true
    }
done
sleep 1
echo -e "${GREEN}✅ Ports cleaned${NC}"

# Step 5: Build production bundle
echo -e "${YELLOW}Step 4: Building production bundle...${NC}"
npm run build >/dev/null 2>&1
echo -e "${GREEN}✅ Build complete${NC}"

# Step 6: Start the server
echo -e "${YELLOW}Step 5: Starting production server...${NC}"
echo ""
npm run start:prod &
SERVER_PID=$!

# Wait for server to start and show output
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Server started successfully (PID: $SERVER_PID)${NC}"
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  🚀 Ready to Go!                           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Frontend:  ${BLUE}http://localhost:3000${NC}"
    echo -e "${GREEN}Backend:   ${BLUE}http://localhost:3004${NC}"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo -e "  Stop server: ${BLUE}kill $SERVER_PID${NC}"
    echo -e "  Dev mode:    ${BLUE}npm run dev${NC}"
    echo -e "  Build:       ${BLUE}npm run build${NC}"
    echo ""
    wait $SERVER_PID
else
    echo -e "${RED}❌ Failed to start server${NC}"
    exit 1
fi
