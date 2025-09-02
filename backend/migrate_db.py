#!/usr/bin/env python3
"""
Database migration script for Prompt Optimization Playground.

This script handles database migrations for new tables and schema changes.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database.models import Base
from app.database.connection import DATABASE_URL

def check_database_connection():
    """Check if database connection is working."""
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def create_tables():
    """Create all tables if they don't exist."""
    try:
        engine = create_engine(DATABASE_URL)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully")
                   # Verify tables exist
        with engine.connect() as conn:
            tables = [
                'providers', 'models', 'prompts', 'outputs', 'prompt_versions',
                'knowledge_bases', 'knowledge_base_contents'
            ]
            
            for table in tables:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"✅ Table '{table}' exists with {count} records")
                
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    return True

def migrate_prompt_versions():
    """Migrate database to add prompt versioning support."""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("🔄 Starting prompt versioning migration...")
            
            # Detect database type
            db_type = "postgresql" if "postgresql" in DATABASE_URL else "sqlite"
            print(f"🔍 Detected database type: {db_type}")
            
            # Check if prompt_versions table already exists
            if db_type == "sqlite":
                result = conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='prompt_versions'
                """))
            else:  # postgresql
                result = conn.execute(text("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'prompt_versions'
                """))
            
            if result.fetchone():
                print("ℹ️  prompt_versions table already exists. Skipping creation.")
            else:
                print("📝 Creating prompt_versions table...")
                
                if db_type == "sqlite":
                    conn.execute(text("""
                        CREATE TABLE prompt_versions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            prompt_id INTEGER NOT NULL,
                            version_number INTEGER NOT NULL,
                            prompt_text TEXT NOT NULL,
                            system_prompt TEXT,
                            temperature REAL DEFAULT 0.7,
                            max_tokens INTEGER DEFAULT 1000,
                            provider_id INTEGER NOT NULL,
                            model_id INTEGER NOT NULL,
                            files TEXT,  -- JSON string
                            images TEXT,  -- JSON string
                            include_file_content BOOLEAN DEFAULT 1,
                            file_content_prefix TEXT DEFAULT 'File content:\\n',
                            output TEXT,  -- JSON string
                            locked_by_user TEXT DEFAULT 'default_user',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (prompt_id) REFERENCES prompts (id) ON DELETE CASCADE,
                            FOREIGN KEY (provider_id) REFERENCES providers (id),
                            FOREIGN KEY (model_id) REFERENCES models (id)
                        )
                    """))
                else:  # postgresql
                    conn.execute(text("""
                        CREATE TABLE prompt_versions (
                            id SERIAL PRIMARY KEY,
                            prompt_id INTEGER NOT NULL,
                            version_number INTEGER NOT NULL,
                            prompt_text TEXT NOT NULL,
                            system_prompt TEXT,
                            temperature REAL DEFAULT 0.7,
                            max_tokens INTEGER DEFAULT 1000,
                            provider_id INTEGER NOT NULL,
                            model_id INTEGER NOT NULL,
                            files TEXT,  -- JSON string
                            images TEXT,  -- JSON string
                            include_file_content BOOLEAN DEFAULT TRUE,
                            file_content_prefix TEXT DEFAULT 'File content:\\n',
                            output TEXT,  -- JSON string
                            locked_by_user TEXT DEFAULT 'default_user',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (prompt_id) REFERENCES prompts (id) ON DELETE CASCADE,
                            FOREIGN KEY (provider_id) REFERENCES providers (id),
                            FOREIGN KEY (model_id) REFERENCES models (id)
                        )
                    """))
                
                # Create indexes for better performance
                conn.execute(text("""
                    CREATE INDEX idx_prompt_versions_prompt_id 
                    ON prompt_versions (prompt_id)
                """))
                
                conn.execute(text("""
                    CREATE INDEX idx_prompt_versions_version_number 
                    ON prompt_versions (prompt_id, version_number)
                """))
                
                print("✅ prompt_versions table created successfully.")
            
            # Check if columns exist in prompts table
            if db_type == "sqlite":
                result = conn.execute(text("PRAGMA table_info(prompts)"))
                columns = [column[1] for column in result.fetchall()]
            else:  # postgresql
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'prompts' AND table_schema = 'public'
                """))
                columns = [column[0] for column in result.fetchall()]
            
            if 'last_output' not in columns:
                print("📝 Adding last_output column to prompts table...")
                if db_type == "sqlite":
                    conn.execute(text("""
                        ALTER TABLE prompts 
                        ADD COLUMN last_output TEXT
                    """))
                else:  # postgresql
                    conn.execute(text("""
                        ALTER TABLE prompts 
                        ADD COLUMN last_output JSON
                    """))
                print("✅ last_output column added successfully.")
            
            if 'updated_at' not in columns:
                print("📝 Adding updated_at column to prompts table...")
                conn.execute(text("""
                    ALTER TABLE prompts 
                    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                """))
                print("✅ updated_at column added successfully.")
            
            # Remove the old version column if it exists
            if 'version' in columns:
                print("🔄 Removing old version column from prompts table...")
                if db_type == "sqlite":
                    # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
                    result = conn.execute(text("PRAGMA table_info(prompts)"))
                    old_columns = result.fetchall()
                    
                    # Create new table structure
                    conn.execute(text("""
                        CREATE TABLE prompts_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            uuid TEXT UNIQUE,
                            user_id TEXT DEFAULT 'default_user',
                            provider_id INTEGER NOT NULL,
                            model_id INTEGER NOT NULL,
                            title TEXT,
                            text TEXT NOT NULL,
                            system_prompt TEXT,
                            temperature REAL DEFAULT 0.7,
                            max_tokens INTEGER DEFAULT 1000,
                            last_output TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (provider_id) REFERENCES providers (id),
                            FOREIGN KEY (model_id) REFERENCES models (id)
                        )
                    """))
                    
                    # Copy data from old table to new table
                    conn.execute(text("""
                        INSERT INTO prompts_new (
                            id, uuid, user_id, provider_id, model_id, title, text, 
                            system_prompt, temperature, max_tokens, created_at
                        )
                        SELECT id, uuid, user_id, provider_id, model_id, title, text,
                               system_prompt, temperature, max_tokens, created_at
                        FROM prompts
                    """))
                    
                    # Drop old table and rename new table
                    conn.execute(text("DROP TABLE prompts"))
                    conn.execute(text("ALTER TABLE prompts_new RENAME TO prompts"))
                else:  # postgresql
                    # PostgreSQL supports DROP COLUMN
                    conn.execute(text("ALTER TABLE prompts DROP COLUMN version"))
                
                print("✅ Old version column removed successfully.")
            
            # Create trigger to update updated_at timestamp
            if db_type == "sqlite":
                conn.execute(text("""
                    CREATE TRIGGER IF NOT EXISTS update_prompts_updated_at
                    AFTER UPDATE ON prompts
                    BEGIN
                        UPDATE prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                    END
                """))
            else:  # postgresql
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION update_updated_at_column()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at = CURRENT_TIMESTAMP;
                        RETURN NEW;
                    END;
                    $$ language 'plpgsql';
                """))
                
                conn.execute(text("""
                    DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
                    CREATE TRIGGER update_prompts_updated_at
                        BEFORE UPDATE ON prompts
                        FOR EACH ROW
                        EXECUTE FUNCTION update_updated_at_column();
                """))
            
            conn.commit()
            print("✅ Prompt versioning migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Prompt versioning migration failed: {e}")
        return False

def migrate_vision_support():
    """Migrate database to add vision support to models."""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("🔍 Starting vision support migration...")
            
            # Detect database type
            db_type = "postgresql" if "postgresql" in DATABASE_URL else "sqlite"
            
            # Check if supports_vision column exists in models table
            if db_type == "sqlite":
                result = conn.execute(text("PRAGMA table_info(models)"))
                columns = [column[1] for column in result.fetchall()]
            else:  # postgresql
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'models' AND table_schema = 'public'
                """))
                columns = [column[0] for column in result.fetchall()]
            
            if 'supports_vision' not in columns:
                print("📝 Adding supports_vision column to models table...")
                conn.execute(text("ALTER TABLE models ADD COLUMN supports_vision BOOLEAN DEFAULT FALSE"))
                print("✅ supports_vision column added successfully.")
            else:
                print("ℹ️  supports_vision column already exists.")
            
            # Update existing models with vision capabilities
            print("🔄 Updating model vision capabilities...")
            
            # Vision-capable models from Groq
            groq_vision_models = {
                "meta-llama/llama-4-scout-17b-16e-instruct",
                "meta-llama/llama-4-maverick-17b-128e-instruct"
            }
            
            # Vision-capable models from OpenAI
            openai_vision_models = {
                "gpt-4-vision-preview",
                "gpt-4o",
                "gpt-4o-mini"
            }
            
            all_vision_models = groq_vision_models.union(openai_vision_models)
            
            # Update models with vision support
            for model_name in all_vision_models:
                conn.execute(text("""
                    UPDATE models 
                    SET supports_vision = TRUE 
                    WHERE name = :model_name
                """), {"model_name": model_name})
                print(f"✅ Updated {model_name} to support vision")
            
            # Set non-vision models to FALSE
            # Use a more compatible approach for both SQLite and PostgreSQL
            vision_models_list = list(all_vision_models)
            if vision_models_list:
                placeholders = ','.join([':model_' + str(i) for i in range(len(vision_models_list))])
                params = {f'model_{i}': model for i, model in enumerate(vision_models_list)}
                
                conn.execute(text(f"""
                    UPDATE models 
                    SET supports_vision = FALSE 
                    WHERE name NOT IN ({placeholders})
                """), params)
            else:
                # If no vision models, set all to FALSE
                conn.execute(text("""
                    UPDATE models 
                    SET supports_vision = FALSE
                """))
            
            conn.commit()
            print("✅ Vision support migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Vision support migration failed: {e}")
        return False

def migrate_structured_output():
    """Migrate database to add structured output support to prompt versions."""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("🔄 Starting structured output migration...")
            
            # Detect database type
            db_type = "postgresql" if "postgresql" in DATABASE_URL else "sqlite"
            print(f"🔍 Detected database type: {db_type}")
            
            # Check if structured_output column exists in prompt_versions table
            if db_type == "sqlite":
                result = conn.execute(text("PRAGMA table_info(prompt_versions)"))
                columns = [column[1] for column in result.fetchall()]
            else:  # postgresql
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'prompt_versions' AND table_schema = 'public'
                """))
                columns = [column[0] for column in result.fetchall()]
            
            # Add structured_output column if it doesn't exist
            if 'structured_output' not in columns:
                print("📝 Adding structured_output column to prompt_versions table...")
                conn.execute(text("ALTER TABLE prompt_versions ADD COLUMN structured_output BOOLEAN DEFAULT FALSE"))
                print("✅ structured_output column added successfully.")
            else:
                print("ℹ️  structured_output column already exists.")
            
            # Add json_schema column if it doesn't exist
            if 'json_schema' not in columns:
                print("📝 Adding json_schema column to prompt_versions table...")
                if db_type == "sqlite":
                    conn.execute(text("ALTER TABLE prompt_versions ADD COLUMN json_schema TEXT"))
                else:  # postgresql
                    conn.execute(text("ALTER TABLE prompt_versions ADD COLUMN json_schema TEXT"))
                print("✅ json_schema column added successfully.")
            else:
                print("ℹ️  json_schema column already exists.")
            
            # Add comments for PostgreSQL
            if db_type == "postgresql":
                try:
                    conn.execute(text("""
                        COMMENT ON COLUMN prompt_versions.structured_output IS 'Whether structured output was enabled for this version'
                    """))
                    conn.execute(text("""
                        COMMENT ON COLUMN prompt_versions.json_schema IS 'JSON schema used for structured output formatting'
                    """))
                    print("✅ Column comments added successfully.")
                except Exception as e:
                    print(f"⚠️  Warning: Could not add column comments: {e}")
            
            conn.commit()
            print("✅ Structured output migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Structured output migration failed: {e}")
        return False

# def add_sample_data():
#     """Add sample data for testing."""
#     try:
#         from app.database.connection import get_db
#         from app.database.models import Provider, Model, Experiment, ModelCard
#         from sqlalchemy.orm import Session
        
#         engine = create_engine(DATABASE_URL)
#         SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
#         with SessionLocal() as db:
#             # Check if sample data already exists
#             provider_count = db.query(Provider).count()
#             if provider_count > 0:
#                 print("ℹ️  Sample data already exists, skipping...")
#                 return True
            
#             # Add sample providers
#             print("📝 Adding sample providers...")
#             openai_provider = Provider(
#                 name="openai",
#                 api_key="sk-sample-key-openai",
#                 is_active=True
#             )
#             groq_provider = Provider(
#                 name="groq",
#                 api_key="gsk-sample-key-groq",
#                 is_active=True
#             )
            
#             db.add(openai_provider)
#             db.add(groq_provider)
#             db.commit()
#             db.refresh(openai_provider)
#             db.refresh(groq_provider)
            
#             # Add sample models
#             print("🤖 Adding sample models...")
#             models = [
#                 Model(
#                     provider_id=openai_provider.id,
#                     name="gpt-4",
#                     description="GPT-4 model for advanced reasoning",
#                     context_length=8192,
#                     cost_per_token_input=0.00003,
#                     cost_per_token_output=0.00006,
#                     is_available=True
#                 ),
#                 Model(
#                     provider_id=openai_provider.id,
#                     name="gpt-3.5-turbo",
#                     description="GPT-3.5 Turbo for fast responses",
#                     context_length=4096,
#                     cost_per_token_input=0.0000015,
#                     cost_per_token_output=0.000002,
#                     is_available=True
#                 ),
#                 Model(
#                     provider_id=groq_provider.id,
#                     name="llama2-70b-4096",
#                     description="Llama2 70B model via Groq",
#                     context_length=4096,
#                     cost_per_token_input=0.0000007,
#                     cost_per_token_output=0.0000008,
#                     is_available=True
#                 ),
#                 Model(
#                     provider_id=groq_provider.id,
#                     name="mixtral-8x7b-32768",
#                     description="Mixtral 8x7B model via Groq",
#                     context_length=32768,
#                     cost_per_token_input=0.00000014,
#                     cost_per_token_output=0.00000042,
#                     is_available=True
#                 )
#             ]
            
#             for model in models:
#                 db.add(model)
#             db.commit()
            
#             # Add sample experiments
#             print("🧪 Adding sample experiments...")
#             experiments = [
#                 Experiment(
#                     name="Executive Summary Report Generation",
#                     description="Optimizing prompts for executive summary generation with iterative refinement",
#                     type="report_generation",
#                     status="running",
#                     progress=75.0,
#                     target_score=8.5,
#                     current_score=7.8,
#                     iterations=3,
#                     max_iterations=5,
#                     dataset_size=50,
#                     report_type="executive_summary",
#                     user_id="default_user"
#                 ),
#                 Experiment(
#                     name="Technical Analysis Report",
#                     description="Optimized prompts for technical analysis with data-driven insights",
#                     type="report_generation",
#                     status="completed",
#                     progress=100.0,
#                     target_score=9.0,
#                     current_score=9.2,
#                     iterations=4,
#                     max_iterations=4,
#                     dataset_size=30,
#                     report_type="technical_analysis",
#                     user_id="default_user"
#                 )
#             ]
            
#             for experiment in experiments:
#                 db.add(experiment)
#             db.commit()
            
#             # Add sample model cards
#             print("📋 Adding sample model cards...")
#             model_cards = [
#                 ModelCard(
#                     title="Story Writing Model Card",
#                     description="A comprehensive evaluation of story writing prompts across multiple models",
#                     status="published",
#                     metrics={
#                         "total_prompts": 5,
#                         "total_outputs": 15,
#                         "total_evaluations": 12,
#                         "avg_score": 8.2,
#                         "total_cost": 0.156
#                     },
#                     models_tested=["gpt-4", "gpt-3.5-turbo", "llama2-70b"],
#                     providers=["openai", "groq"],
#                     experiment_ids=[1, 2],
#                     user_id="default_user"
#                 ),
#                 ModelCard(
#                     title="Technical Explanation Model Card",
#                     description="Evaluation of models for technical content explanation",
#                     status="draft",
#                     metrics={
#                         "total_prompts": 3,
#                         "total_outputs": 8,
#                         "total_evaluations": 6,
#                         "avg_score": 7.8,
#                         "total_cost": 0.089
#                     },
#                     models_tested=["gpt-4", "llama2-70b"],
#                     providers=["openai", "groq"],
#                     experiment_ids=[1],
#                     user_id="default_user"
#                 )
#             ]
            
#             for card in model_cards:
#                 db.add(card)
#             db.commit()
            
#             print("✅ Sample data added successfully")
#             return True
            
#     except Exception as e:
#         print(f"❌ Error adding sample data: {e}")
#         return False

def migrate_prompt_title_constraints():
    """Migrate database to add unique constraints on prompt titles."""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("🔄 Starting prompt title constraints migration...")
            
            # Detect database type
            db_type = "postgresql" if "postgresql" in DATABASE_URL else "sqlite"
            print(f"🔍 Detected database type: {db_type}")
            
            # Check if unique constraint already exists
            if db_type == "sqlite":
                # For SQLite, we need to recreate the table to add constraints
                # This is a simplified approach - in production, you'd want more careful migration
                print("ℹ️  SQLite detected. Unique constraints will be applied on next table recreation.")
            else:  # postgresql
                # Check if constraint exists
                result = conn.execute(text("""
                    SELECT constraint_name FROM information_schema.table_constraints 
                    WHERE table_name = 'prompts' AND constraint_type = 'UNIQUE' 
                    AND constraint_name LIKE '%title%'
                """))
                
                if not result.fetchone():
                    print("📝 Adding unique constraint on prompt titles...")
                    conn.execute(text("""
                        ALTER TABLE prompts 
                        ADD CONSTRAINT unique_prompt_title_per_user 
                        UNIQUE (title, user_id)
                    """))
                    print("✅ Unique constraint added successfully")
                else:
                    print("ℹ️  Unique constraint already exists")
            
            # Add is_active column if it doesn't exist
            try:
                conn.execute(text("ALTER TABLE prompts ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                print("✅ Added is_active column to prompts table")
            except Exception as e:
                if "already exists" in str(e) or "duplicate column" in str(e):
                    print("ℹ️  is_active column already exists")
                else:
                    raise e
            
            conn.commit()
            return True
            
    except Exception as e:
        print(f"❌ Error in prompt title constraints migration: {e}")
        return False

def main():
    """Main migration function."""
    print("🚀 Starting database migration...")
    
    # Check database connection
    if not check_database_connection():
        sys.exit(1)
    
    # Create tables
    if not create_tables():
        sys.exit(1)
    
    # Run prompt versioning migration
    if not migrate_prompt_versions():
        sys.exit(1)
    
    # Run vision support migration
    if not migrate_vision_support():
        sys.exit(1)
    
    # Run structured output migration
    if not migrate_structured_output():
        sys.exit(1)
    
    # Run prompt title constraints migration
    if not migrate_prompt_title_constraints():
        sys.exit(1)
    
    # Skip adding sample data
    print("ℹ️  Skipping sample data addition")
    
    print("🎉 Database migration completed successfully!")

if __name__ == "__main__":
    main()
