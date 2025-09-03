-- Initialize LLM Evaluation Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create additional schemas if needed
CREATE SCHEMA IF NOT EXISTS knowledge_base;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE llm_eval TO llm_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO llm_user;
GRANT ALL PRIVILEGES ON SCHEMA knowledge_base TO llm_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO llm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO llm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO llm_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA knowledge_base GRANT ALL ON TABLES TO llm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA knowledge_base GRANT ALL ON SEQUENCES TO llm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA knowledge_base GRANT ALL ON FUNCTIONS TO llm_user;
