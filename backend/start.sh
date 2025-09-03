#!/bin/bash

# Startup script for LLM Evaluation Backend
echo "Starting LLM Evaluation Backend..."

# Check if we're in development mode
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Running in development mode with auto-reload..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Running in production mode..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
