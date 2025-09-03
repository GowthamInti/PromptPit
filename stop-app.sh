#!/bin/bash

echo "🛑 Stopping LLM Evaluation Playground..."

# Stop and remove containers
docker stop llm-eval-frontend llm-eval-backend llm-eval-postgres 2>/dev/null || true
docker rm llm-eval-frontend llm-eval-backend llm-eval-postgres 2>/dev/null || true

# Remove network
docker network rm llm-eval-network 2>/dev/null || true

echo "✅ Application stopped successfully!"
echo "💾 Database data is preserved in volume 'postgres_data'"
echo "📁 Uploads and chroma_db data is preserved in local directories"
