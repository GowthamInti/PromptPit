#!/bin/bash

# Configuration - CHANGE THESE TO YOUR DOCKER HUB USERNAME
DOCKER_USERNAME="28101995"
VERSION="latest"

echo "🔨 Building and pushing Docker images to Docker Hub..."

# Build Backend
echo "📦 Building backend image..."
docker build -t $DOCKER_USERNAME/llm-eval-backend:$VERSION ./backend

# Build Frontend
echo "🎨 Building frontend image..."
docker build -t $DOCKER_USERNAME/llm-eval-frontend:$VERSION ./frontend

# Push Backend
echo "⬆️ Pushing backend image..."
docker push $DOCKER_USERNAME/llm-eval-backend:$VERSION

# Push Frontend
echo "⬆️ Pushing frontend image..."
docker push $DOCKER_USERNAME/llm-eval-frontend:$VERSION

echo "✅ All images built and pushed successfully!"
echo ""
echo "Users can now run your app with:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo "  or"
echo "  ./run-app.sh"
echo ""
echo "Remember to update the image names in docker-compose.prod.yml and run-app.sh"
echo "to match your Docker Hub username: $DOCKER_USERNAME"
