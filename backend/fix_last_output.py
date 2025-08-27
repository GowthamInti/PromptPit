#!/usr/bin/env python3
"""
Script to fix last_output column data issues.
This script updates any records where last_output contains the string 'null' 
and replaces it with NULL.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database.database import get_database_url

def fix_last_output_data():
    """Fix last_output column data issues."""
    engine = create_engine(get_database_url())
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            # Check if we're using PostgreSQL or SQLite
            result = db.execute(text("SELECT version()"))
            db_type = "postgresql" if "PostgreSQL" in result.fetchone()[0] else "sqlite"
            
            print(f"🔍 Detected database type: {db_type}")
            
            # Find records with problematic last_output values
            if db_type == "postgresql":
                result = db.execute(text("""
                    SELECT id, last_output 
                    FROM prompts 
                    WHERE last_output = 'null' OR last_output = 'NULL'
                """))
            else:  # sqlite
                result = db.execute(text("""
                    SELECT id, last_output 
                    FROM prompts 
                    WHERE last_output = 'null' OR last_output = 'NULL'
                """))
            
            problematic_records = result.fetchall()
            
            if problematic_records:
                print(f"🔧 Found {len(problematic_records)} records with problematic last_output values")
                
                for record in problematic_records:
                    prompt_id, last_output = record
                    print(f"   - Prompt ID {prompt_id}: last_output = '{last_output}'")
                
                # Update the problematic records
                if db_type == "postgresql":
                    db.execute(text("""
                        UPDATE prompts 
                        SET last_output = NULL 
                        WHERE last_output = 'null' OR last_output = 'NULL'
                    """))
                else:  # sqlite
                    db.execute(text("""
                        UPDATE prompts 
                        SET last_output = NULL 
                        WHERE last_output = 'null' OR last_output = 'NULL'
                    """))
                
                db.commit()
                print(f"✅ Fixed {len(problematic_records)} records")
            else:
                print("✅ No problematic last_output records found")
                
        except Exception as e:
            db.rollback()
            print(f"❌ Error fixing last_output data: {e}")
            raise

if __name__ == "__main__":
    print("🔧 Fixing last_output column data issues...")
    fix_last_output_data()
    print("✅ Done!")
