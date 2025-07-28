@echo off
echo 🚀 Setting up Personal AI Agent...

REM Step 1: Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Step 2: Copy environment template
if not exist .env.local (
    echo 📋 Creating environment file...
    copy .env.template .env.local
    echo ✅ Created .env.local - Please add your API keys!
) else (
    echo ✅ .env.local already exists
)

REM Step 3: Create data directory
if not exist data mkdir data

REM Step 4: Check TypeScript compilation
echo 🔍 Checking TypeScript compilation...
call npx tsc --noEmit --skipLibCheck

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Add your API keys to .env.local:
echo    - OPENAI_API_KEY (required)
echo    - OPENROUTER_API_KEY (required)
echo    - TAVILY_API_KEY (optional, for better search)
echo    - SERPAPI_API_KEY (optional, for Google search)
echo.
echo 2. Start the development server:
echo    npm run dev
echo.
echo 3. Test the API at:
echo    http://localhost:3000/api/agent

pause