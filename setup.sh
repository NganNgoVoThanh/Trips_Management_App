#!/bin/bash

# Trips Management System - Setup Script
# This script sets up the project with all necessary dependencies

echo "🚀 Setting up Trips Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install shadcn/ui components
echo "🎨 Installing UI components..."
npx shadcn-ui@latest init -y

# Install all required shadcn/ui components
echo "📦 Installing shadcn/ui components..."
npx shadcn-ui@latest add button -y
npx shadcn-ui@latest add card -y
npx shadcn-ui@latest add dialog -y
npx shadcn-ui@latest add dropdown-menu -y
npx shadcn-ui@latest add input -y
npx shadcn-ui@latest add label -y
npx shadcn-ui@latest add select -y
npx shadcn-ui@latest add tabs -y
npx shadcn-ui@latest add badge -y
npx shadcn-ui@latest add avatar -y
npx shadcn-ui@latest add separator -y
npx shadcn-ui@latest add progress -y
npx shadcn-ui@latest add scroll-area -y
npx shadcn-ui@latest add switch -y
npx shadcn-ui@latest add tooltip -y
npx shadcn-ui@latest add popover -y
npx shadcn-ui@latest add command -y
npx shadcn-ui@latest add checkbox -y
npx shadcn-ui@latest add radio-group -y
npx shadcn-ui@latest add textarea -y
npx shadcn-ui@latest add navigation-menu -y
npx shadcn-ui@latest add alert-dialog -y

# Create environment file
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp .env.local.example .env.local
    echo "⚠️  Please update .env.local with your actual credentials"
fi

# Create public directory and add placeholder for logo
if [ ! -d public ]; then
    mkdir -p public
fi

if [ ! -f public/intersnack-logo.png ]; then
    echo "⚠️  Please add your Intersnack logo to public/intersnack-logo.png"
fi

# Build the project to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add your Intersnack logo to public/intersnack-logo.png"
    echo "2. Update .env.local with your credentials:"
    echo "   - Microsoft Fabric credentials"
    echo "   - OpenAI or Claude API key"
    echo "   - Email service configuration"
    echo "3. Run 'npm run dev' to start the development server"
    echo ""
    echo "🌐 Access the application at http://localhost:3000"
else
    echo "❌ Build failed. Please check for errors above."
    exit 1
fi