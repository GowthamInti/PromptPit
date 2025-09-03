#!/bin/bash

echo "🚀 Starting LLM Evaluation Playground..."

# Create network if it doesn't exist
docker network create llm-eval-network 2>/dev/null || true

# Start PostgreSQL
echo "📦 Starting PostgreSQL database..."
docker run -d \
  --name llm-eval-postgres \
  --network llm-eval-network \
  -e POSTGRES_DB=llm_eval \
  -e POSTGRES_USER=llm_user \
  -e POSTGRES_PASSWORD=llm_password \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Start Backend
echo "🔧 Starting Backend API..."
docker run -d \
  --name llm-eval-backend \
  --network llm-eval-network \
  -e DATABASE_URL=postgresql://llm_user:llm_password@llm-eval-postgres:5432/llm_eval \
  -e SECRET_KEY=change-this-in-production \
  -e ENVIRONMENT=production \
  -e CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost:8000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/chroma_db:/app/chroma_db \
  -p 8000:8000 \
  your-dockerhub-username/llm-eval-backend:latest

# Wait for Backend to be ready
echo "⏳ Waiting for Backend to be ready..."
sleep 15

# Start Frontend
echo "🎨 Starting Frontend..."
docker run -d \
  --name llm-eval-frontend \
  --network llm-eval-network \
  -e REACT_APP_API_URL=http://localhost:8000 \
  -e NODE_ENV=production \
  -p 80:80 \
  your-dockerhub-username/llm-eval-frontend:latest

echo "✅ Application started successfully!"
echo "🌐 Frontend: http://localhost"
echo "🔌 Backend API: http://localhost:8000"
echo "🗄️  Database: localhost:5432"
echo ""
echo "To stop the application, run: ./stop-app.sh"
