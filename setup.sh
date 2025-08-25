#!/bin/bash

# Crawlio Setup Script
echo "🚀 Setting up Crawlio - Web Crawling & Scraping Service"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker is not installed. You can still run the application locally."
    DOCKER_AVAILABLE=false
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "✅ Environment file created. Please edit .env with your configuration."
else
    echo "✅ Environment file already exists."
fi

# Create logs directory
mkdir -p logs

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install chromium

# Setup frontend
if [ -d "frontend" ]; then
    echo "🎨 Setting up frontend..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Set up PostgreSQL and Redis databases"
echo "3. Configure Stripe API keys (for billing)"
echo ""
echo "To start the application:"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "With Docker:"
    echo "  docker-compose up -d"
    echo ""
    echo "Without Docker:"
    echo "  npm run dev"
else
    echo "  npm run dev"
fi

echo ""
echo "API will be available at: http://localhost:3000"
echo "Frontend will be available at: http://localhost:3001"
echo ""
echo "📚 For more information, see README.md"
