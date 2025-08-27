#!/usr/bin/env python3
"""
Test script to verify the migration fix works.
"""

import os
import sys
from sqlalchemy import create_engine, text
from app.database.connection import DATABASE_URL

def test_vision_migration_fix():
    """Test the vision migration fix."""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("🔍 Testing vision support migration fix...")
            
            # Test data
            vision_models = [
                "meta-llama/llama-4-scout-17b-16e-instruct",
                "meta-llama/llama-4-maverick-17b-128e-instruct",
                "gpt-4-vision-preview",
                "gpt-4o",
                "gpt-4o-mini"
            ]
            
            # Test the fixed query approach
            if vision_models:
                placeholders = ','.join([':model_' + str(i) for i in range(len(vision_models))])
                params = {f'model_{i}': model for i, model in enumerate(vision_models)}
                
                # Just test the query construction, don't execute
                query = f"""
                    UPDATE models 
                    SET supports_vision = FALSE 
                    WHERE name NOT IN ({placeholders})
                """
                
                print(f"✅ Query constructed successfully:")
                print(f"Query: {query}")
                print(f"Parameters: {params}")
                
                # Test with a simple SELECT to verify the query works
                test_query = f"""
                    SELECT name FROM models 
                    WHERE name NOT IN ({placeholders})
                    LIMIT 5
                """
                
                result = conn.execute(text(test_query), params)
                rows = result.fetchall()
                print(f"✅ Test query executed successfully, found {len(rows)} rows")
                
            return True
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    test_vision_migration_fix()
