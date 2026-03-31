#!/bin/bash

echo "🚀 Starting FlowKit Demo..."
echo ""
echo "📦 Building SDK..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🌐 Starting demo server..."
    echo "   Open http://localhost:3000 in your browser"
    echo ""
    echo "   Press Ctrl+C to stop the server"
    echo ""
    npm run demo
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
