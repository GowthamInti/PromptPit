# backend/app/database/models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Provider(Base):
    __tablename__ = "providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # 'openai', 'groq'
    api_key = Column(String(255), nullable=False)  # Encrypted in production
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    models = relationship("Model", back_populates="provider", cascade="all, delete-orphan")
    prompts = relationship("Prompt", back_populates="provider")

class Model(Base):
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    name = Column(String(100), nullable=False)  # 'gpt-4', 'llama2-70b-4096'
    description = Column(Text)
    context_length = Column(Integer)
    cost_per_token_input = Column(Float)  # For cost tracking
    cost_per_token_output = Column(Float)
    is_available = Column(Boolean, default=True)
    supports_vision = Column(Boolean, default=False)  # Vision capability flag
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="models")
    prompts = relationship("Prompt", back_populates="model", cascade="all, delete-orphan")

class Prompt(Base):
    __tablename__ = "prompts"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(100), default="default_user")  # For multi-user support later
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    title = Column(String(255))
    text = Column(Text, nullable=False)
    system_prompt = Column(Text)  # Optional system message
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=1000)
    last_output = Column(JSON)  # Store the last output for quick access
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="prompts")
    model = relationship("Model", back_populates="prompts")
    outputs = relationship("Output", back_populates="prompt", cascade="all, delete-orphan")
    versions = relationship("PromptVersion", back_populates="prompt", cascade="all, delete-orphan")

class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    prompt_text = Column(Text, nullable=False)
    system_prompt = Column(Text)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=1000)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    files = Column(JSON)  # Store file metadata
    images = Column(JSON)  # Store image metadata
    include_file_content = Column(Boolean, default=True)
    file_content_prefix = Column(String(255), default="File content:\n")
    output = Column(JSON)  # Store the output that was generated
    locked_by_user = Column(String(100), default="default_user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    prompt = relationship("Prompt", back_populates="versions")
    provider = relationship("Provider")
    model = relationship("Model")

class Output(Base):
    __tablename__ = "outputs"
    
    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    output_text = Column(Text, nullable=False)
    latency_ms = Column(Float)  # Response time in milliseconds
    token_usage = Column(JSON)  # {"input": 50, "output": 200, "total": 250}
    cost_usd = Column(Float)  # Calculated cost
    response_metadata = Column(JSON)  # Additional provider-specific metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    prompt = relationship("Prompt", back_populates="outputs")
    evaluations = relationship("Evaluation", back_populates="output", cascade="all, delete-orphan")

class Evaluation(Base):
    __tablename__ = "evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    output_id = Column(Integer, ForeignKey("outputs.id"), nullable=False)
    judge_provider_id = Column(Integer, ForeignKey("providers.id"))
    judge_model_id = Column(Integer, ForeignKey("models.id"))
    judge_prompt = Column(Text, nullable=False)
    score = Column(Float)  # Numerical score
    feedback = Column(Text)  # Text feedback
    criteria = Column(JSON)  # Evaluation criteria used
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    output = relationship("Output", back_populates="evaluations")

class Experiment(Base):
    __tablename__ = "experiments"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(100), default="default_user")
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), nullable=False)  # 'report_generation', 'content_creation', etc.
    status = Column(String(20), default='pending')  # 'pending', 'running', 'completed', 'failed'
    progress = Column(Float, default=0.0)  # 0-100
    target_score = Column(Float)
    current_score = Column(Float, default=0.0)
    iterations = Column(Integer, default=0)
    max_iterations = Column(Integer, default=5)
    dataset_size = Column(Integer, default=0)
    report_type = Column(String(50))  # For report generation experiments
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    optimization_cycles = relationship("OptimizationCycle", back_populates="experiment", cascade="all, delete-orphan")

class OptimizationCycle(Base):
    __tablename__ = "optimization_cycles"
    
    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    iteration = Column(Integer, nullable=False)
    score = Column(Float)
    prompt_changes = Column(Text)  # Description of changes made
    prompt_id = Column(Integer, ForeignKey("prompts.id"))  # Reference to the prompt used
    output_id = Column(Integer, ForeignKey("outputs.id"))  # Reference to the output generated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    experiment = relationship("Experiment", back_populates="optimization_cycles")
    prompt = relationship("Prompt")
    output = relationship("Output")

class ModelCard(Base):
    __tablename__ = "model_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(100), default="default_user")
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(20), default='draft')  # 'draft', 'published', 'archived'
    metrics = Column(JSON)  # {"total_prompts": 5, "total_outputs": 15, "avg_score": 8.2, "total_cost": 0.156}
    models_tested = Column(JSON)  # ["gpt-4", "gpt-3.5-turbo", "llama2-70b"]
    providers = Column(JSON)  # ["openai", "groq"]
    experiment_ids = Column(JSON)  # [1, 2, 3] - References to experiments included
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())