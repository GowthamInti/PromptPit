# 🚀 GitHub Actions Setup for Docker Images

This guide will help you set up automatic Docker image building and pushing to Docker Hub using GitHub Actions.

## 🔑 Required Secrets

You need to add these secrets to your GitHub repository:

### 1. Go to your repository settings:
- Navigate to your GitHub repository
- Click **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret**

### 2. Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DOCKERHUB_USERNAME` | `28101995` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | `your-dockerhub-access-token` | Your Docker Hub access token |

## 🔐 How to get Docker Hub Access Token:

1. **Login to Docker Hub** at https://hub.docker.com
2. **Go to Account Settings** → **Security**
3. **Click "New Access Token"**
4. **Give it a name** (e.g., "GitHub Actions")
5. **Copy the token** (you won't see it again!)

## 📁 Workflow Files

I've created two workflow files for you:

### 1. **`docker-simple.yml`** (Recommended for beginners)
- Builds and pushes `:latest` tags
- Triggers on push to main branch
- Simple and straightforward

### 2. **`docker-advanced.yml`**
- Creates multiple tags (branch names, commit SHAs, versions)
- Updates docker-compose files automatically
- More complex but more flexible

## 🎯 How It Works

### **Simple Workflow:**
1. **Trigger**: Push to main branch or manual trigger
2. **Build**: Creates Docker images from your code
3. **Push**: Uploads images to Docker Hub with `:latest` tag
4. **Result**: Users can pull `28101995/llm-eval-backend:latest`

### **Advanced Workflow:**
1. **Trigger**: Push to main branch, tags, or manual trigger
2. **Build**: Creates Docker images from your code
3. **Push**: Uploads images with multiple tags
4. **Update**: Automatically updates docker-compose files
5. **Commit**: Pushes updated files back to repository

## 🚀 Usage

### **For Users:**
```bash
# Pull and run the latest images
docker-compose -f docker-compose.prod.yml up -d

# Or use the run script
./run-app.sh
```

### **For Development:**
```bash
# Push to main branch to trigger build
git push origin main

# Or manually trigger from GitHub Actions tab
```

## 🔧 Customization

### **Change Image Names:**
Edit the workflow files and update:
```yaml
env:
  IMAGE_NAME_BACKEND: your-username/your-backend-name
  IMAGE_NAME_FRONTEND: your-username/your-frontend-name
```

### **Add More Triggers:**
```yaml
on:
  push:
    branches: [ main, develop, feature/* ]
  pull_request:
    branches: [ main ]
  release:
    types: [ published ]
```

### **Add Build Arguments:**
```yaml
- name: Build and push Backend image
  uses: docker/build-push-action@v5
  with:
    context: ./backend
    push: true
    tags: ${{ env.IMAGE_NAME_BACKEND }}:latest
    build-args: |
      BUILD_ENV=production
      VERSION=${{ github.sha }}
```

## 📊 Monitoring

### **Check Workflow Status:**
- Go to **Actions** tab in your repository
- View workflow runs and logs
- See build times and success rates

### **Docker Hub:**
- Check your Docker Hub repository
- See all pushed images and tags
- Monitor image sizes and pull counts

## 🆘 Troubleshooting

### **Common Issues:**

1. **Authentication Failed:**
   - Check `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets
   - Ensure token has write permissions

2. **Build Failed:**
   - Check Dockerfile syntax
   - Verify all required files are present
   - Check GitHub Actions logs for specific errors

3. **Push Failed:**
   - Ensure Docker Hub repository exists
   - Check network connectivity
   - Verify token permissions

### **Debug Commands:**
```bash
# Test Docker Hub login locally
docker login -u your-username

# Build images locally to test
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend
```

## 🎉 Benefits

- **Automated builds** on every code push
- **Consistent images** across all environments
- **Easy deployment** for users
- **Version tracking** with git commits
- **Professional distribution** like popular open-source tools

---

**Pro Tip**: Start with the simple workflow and upgrade to the advanced one once you're comfortable with the basics!
