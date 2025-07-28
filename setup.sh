#!/bin/bash

echo "🚀 Setting up Personal AI Agent..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Copy environment template
if [ ! -f .env.local ]; then
    echo "📋 Creating environment file..."
    cp .env.template .env.local
    echo "✅ Created .env.local - Please add your API keys!"
else
    echo "✅ .env.local already exists"
fi

# Step 3: Create data directory
mkdir -p data

# Step 4: Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npx tsc --noEmit --skipLibCheck

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your API keys to .env.local:"
echo "   - OPENAI_API_KEY (required)"
echo "   - OPENROUTER_API_KEY (required)"
echo "   - TAVILY_API_KEY (optional, for better search)"
echo "   - SERPAPI_API_KEY (optional, for Google search)"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Test the API at:"
echo "   http://localhost:3000/api/agent"