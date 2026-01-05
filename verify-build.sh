#!/bin/bash

# VaultGuard Build Verification Script
# This script verifies that all components build successfully

set -euo pipefail  # Exit on error, undefined variables, and pipeline failures

echo "================================================"
echo "VaultGuard Build Verification"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Function to print info
info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Check Node.js installation
info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 18 or higher."
fi
NODE_VERSION=$(node --version)
success "Node.js version: $NODE_VERSION"

# Check npm installation
info "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    error "npm is not installed. Please install npm."
fi
NPM_VERSION=$(npm --version)
success "npm version: $NPM_VERSION"

echo ""
echo "================================================"
echo "Building Frontend (Web App)"
echo "================================================"
echo ""

# Build frontend
info "Building frontend..."
cd apps/web
if [ ! -d "node_modules" ]; then
    info "Installing frontend dependencies..."
    npm install --silent
fi

# Check for .env file
if [ ! -f ".env" ]; then
    info "Creating .env file from .env.example..."
    cp .env.example .env
fi

npm run build
success "Frontend build completed successfully"

echo ""
echo "================================================"
echo "Building Backend (API)"
echo "================================================"
echo ""

# Build backend
cd ../api
info "Building backend..."
if [ ! -d "node_modules" ]; then
    info "Installing backend dependencies..."
    npm install --silent
fi

# Check for .env file
if [ ! -f ".env" ]; then
    info "Creating .env file from .env.example..."
    cp .env.example .env
fi

npm run build
success "Backend build completed successfully"

echo ""
echo "================================================"
echo "Build Verification Summary"
echo "================================================"
echo ""
success "All builds completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Start development: npm run dev (from root directory)"
echo "  2. Or use Docker: docker-compose up -d"
echo "  3. Read DEPLOYMENT.md for production deployment"
echo ""
echo "Access:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend API: http://localhost:3001"
echo "  - Health Check: http://localhost:3001/health"
echo ""
