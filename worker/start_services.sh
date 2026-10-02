#!/bin/bash

# Semantic Worker API Startup Script
# This script starts all services and initializes the model

echo "🚀 Starting Semantic Worker API Services..."

# Change to project directory
cd "$(dirname "$0")/.."

# Check if Qdrant is running
echo "📊 Checking Qdrant status..."
if ! curl -s http://localhost:6333/ > /dev/null; then
    echo "Starting Qdrant with Docker..."
    docker-compose up -d qdrant
    echo "Waiting for Qdrant to be ready..."
    sleep 10
else
    echo "✅ Qdrant is already running"
fi

# Navigate to worker directory
cd worker

# Activate virtual environment
echo "🐍 Activating Python virtual environment..."
source ../venv/bin/activate

# Initialize model (this loads the model and fixes the 0 results issue)
echo "🧠 Initializing embedding model..."
python test_model_load.py

if [ $? -eq 0 ]; then
    echo "✅ Model loaded successfully!"
    
    # Start the API server
    echo "🌐 Starting API server on http://localhost:8081..."
    echo "Press Ctrl+C to stop the server"
    echo ""
    python app.py
else
    echo "❌ Failed to load model. Check the logs above."
    exit 1
fi
