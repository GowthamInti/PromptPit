# 🚀 LLM Evaluation Playground - Docker Hub Edition

Run the LLM Evaluation Playground with just a few Docker commands!

## 🐳 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Download the docker-compose file:**
```bash
wget https://raw.githubusercontent.com/GowthamInti/PromptPit/main/docker-compose.prod.yml
```

2. **Start the application:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Access the application:**
   - 🌐 Frontend: http://localhost
   - 🔌 Backend API: http://localhost:8000

### Option 2: Docker Run Commands

1. **Download the run script:**
```bash
wget https://raw.githubusercontent.com/GowthamInti/PromptPit/main/run-app.sh
chmod +x run-app.sh
```

2. **Start the application:**
```bash
./run-app.sh
```

3. **Stop the application:**
```bash
./stop-app.sh
```

## 🔧 Configuration

### Environment Variables

You can customize the application by setting these environment variables:

- `POSTGRES_PASSWORD`: Change the database password
- `CORS_ORIGINS`: Configure allowed origins

### Example with custom values:
```bash
export POSTGRES_PASSWORD="your-secure-password"
docker-compose -f docker-compose.prod.yml up -d
```

## 📁 Data Persistence

The application automatically creates these directories for data persistence:
- `./uploads/` - User uploaded files
- `./chroma_db/` - Vector database files
- `postgres_data` - Database volume (Docker managed)

## 🆘 Troubleshooting

### Check container status:
```bash
docker ps
```

### View logs:
```bash
docker logs llm-eval-backend
docker logs llm-eval-frontend
docker logs llm-eval-postgres
```

### Reset everything:
```bash
./stop-app.sh
docker volume rm postgres_data
./run-app.sh
```

## 🌟 Features

- 🤖 Multi-LLM Provider Support (OpenAI, Groq, etc.)
- 📝 Prompt Engineering & Testing
- 💬 Chat Interface with File Uploads
- 📚 Knowledge Base Management
- 📊 Performance Analytics
- 🔄 Version Control for Prompts

## 📞 Support

- GitHub Issues: [Your Repo URL]
- Documentation: [Your Docs URL]

---

**Note**: This is a production-ready Docker setup. Remember to change default passwords and secret keys for production deployments.
