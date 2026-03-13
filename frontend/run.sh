#!/bin/bash

echo "========================================="
echo "  T3 — Track. Trust. Transform."
echo "  AI Brand Visibility & Trust Platform"
echo "========================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ first."
    echo "  https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "Node.js version: $(node -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install --silent

if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed."
    exit 1
fi

echo ""
echo "Dependencies installed successfully."
echo ""

# Build for production
echo "Building for production..."
npm run build --silent

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed."
    exit 1
fi

echo ""
echo "Build completed successfully."
echo ""

# Start the app
echo "Starting T3 Platform..."
echo ""
echo "========================================="
echo "  App will be available at:"
echo "  http://localhost:4173"
echo ""
echo "  Live version: https://www.T3tx.com"
echo "========================================="
echo ""

npm run preview
