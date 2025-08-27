# 🎯 Versioned Prompt Workspace

## Overview

The Prompt Editor has been evolved into a comprehensive **Versioned Prompt Workspace** that provides persistent, version-controlled prompt management with full history tracking and user-driven versioning.

## ✨ Key Features

### **Prompt Management**
- **Persistent Storage**: All prompts are saved to the database with full metadata
- **Prompt List**: Browse and select from all your saved prompts
- **Create/Edit/Delete**: Full CRUD operations for prompt management
- **Duplicate Prompts**: Create copies of existing prompts for experimentation

### **Version Control**
- **Lock Versions**: Only save versions when you explicitly click "Lock Version"
- **Version History**: Complete history of all locked versions with metadata
- **Version Comparison**: View differences between versions
- **Output Preservation**: Each version includes the output that was generated

### **Enhanced Workflow**
- **Edit/View Modes**: Toggle between editing and viewing modes
- **Auto-save**: Prompts are automatically saved as you work
- **Last Output**: Quick access to the most recent output
- **File Attachments**: Support for documents and images with versioning

## 🎮 How to Use

### **Creating a New Prompt**
1. Click "New Prompt" button
2. Fill in the title and prompt text
3. Configure model settings (provider, model, temperature, etc.)
4. Add any files or images
5. Click "Save Prompt" to persist your work
6. Click "Run" to execute the prompt
7. Click "Lock Version" to create a versioned snapshot

### **Working with Existing Prompts**
1. Select a prompt from the left sidebar
2. View the prompt in read-only mode by default
3. Click the edit icon to make changes
4. Save changes with "Save Prompt"
5. Run the updated prompt
6. Lock a new version when satisfied

### **Version Management**
1. Click the clock icon to view version history
2. Browse all locked versions with timestamps
3. View version metadata (model, settings, files)
4. Copy outputs from any version
5. Compare versions side by side

## 🛠 Technical Implementation

### **Database Schema**

#### **Prompts Table**
```sql
CREATE TABLE prompts (
    id INTEGER PRIMARY KEY,
    uuid TEXT UNIQUE,
    user_id TEXT DEFAULT 'default_user',
    provider_id INTEGER NOT NULL,
    model_id INTEGER NOT NULL,
    title TEXT,
    text TEXT NOT NULL,
    system_prompt TEXT,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    last_output TEXT,  -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Prompt Versions Table**
```sql
CREATE TABLE prompt_versions (
    id INTEGER PRIMARY KEY,
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
    file_content_prefix TEXT DEFAULT 'File content:\n',
    output TEXT,  -- JSON string
    locked_by_user TEXT DEFAULT 'default_user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **API Endpoints**

#### **Prompt Management**
- `GET /api/prompts` - List all prompts
- `POST /api/prompts` - Create new prompt
- `GET /api/prompts/{id}` - Get specific prompt
- `PUT /api/prompts/{id}` - Update prompt
- `DELETE /api/prompts/{id}` - Delete prompt
- `POST /api/prompts/{id}/duplicate` - Duplicate prompt

#### **Versioning**
- `POST /api/prompts/{id}/versions` - Lock new version
- `GET /api/prompts/{id}/versions` - Get version history

#### **Execution**
- `POST /api/run` - Run prompt and get output

### **Frontend Components**

#### **PromptWorkspace.js**
Main component that orchestrates the entire workspace:
- Three-column layout (prompt list, editor, output/versions)
- State management for editing/viewing modes
- Integration with PromptContext for data management

#### **PromptContext.js**
React context for prompt state management:
- CRUD operations for prompts
- Version management
- Loading and error states
- Local storage integration

## 🔄 Workflow States

### **New Prompt State**
- Empty form with default values
- Editing mode enabled
- No saved data
- "Save Prompt" button active

### **Existing Prompt - View Mode**
- Read-only display of prompt data
- "Edit" button to switch to editing
- "Run" and "Lock Version" buttons available
- Version history accessible

### **Existing Prompt - Edit Mode**
- Editable form fields
- "Save Prompt" and "Run" buttons
- Changes tracked but not versioned until locked

### **Version Locked State**
- New version created in database
- Version history updated
- Output preserved with version
- Metadata captured (timestamp, user, settings)

## 📊 Data Flow

```
User Action → Frontend State → API Call → Database → Response → UI Update
```

### **Example: Locking a Version**
1. User clicks "Lock Version"
2. Frontend collects current prompt state + output
3. API call to `POST /api/prompts/{id}/versions`
4. Backend creates new PromptVersion record
5. Response includes version metadata
6. Frontend updates version history display

## 🎨 UI/UX Design

### **Three-Column Layout**
- **Left**: Prompt list with search/filter
- **Middle**: Prompt editor with model configuration
- **Right**: Output display and version history

### **Visual States**
- **Active prompt**: Blue border and background highlight
- **Editing mode**: Form fields enabled, save button active
- **Viewing mode**: Form fields disabled, edit button available
- **Version locked**: Success notification, history updated

### **Responsive Design**
- Mobile-friendly layout
- Collapsible sections
- Touch-optimized interactions

## 🚀 Performance Optimizations

### **Frontend**
- Lazy loading of prompt lists
- Debounced save operations
- Optimistic UI updates
- Efficient state management

### **Backend**
- Database indexes on frequently queried columns
- Efficient JSON storage for complex data
- Caching of model/provider data
- Optimized version queries

## 🔧 Configuration

### **Default Settings**
- Temperature: 0.7
- Max Tokens: 1000
- File Content Prefix: "File content:\n"
- Include File Content: true

### **Supported File Types**
- Documents: PDF, DOCX, PPTX
- Images: PNG, JPG, JPEG, GIF, BMP

## 🧪 Testing

### **Manual Testing Checklist**
- [ ] Create new prompt
- [ ] Save prompt
- [ ] Edit existing prompt
- [ ] Run prompt
- [ ] Lock version
- [ ] View version history
- [ ] Duplicate prompt
- [ ] Delete prompt
- [ ] File uploads
- [ ] Image uploads
- [ ] Model selection
- [ ] Provider selection

### **API Testing**
- [ ] All CRUD operations
- [ ] Version locking
- [ ] Error handling
- [ ] File uploads
- [ ] Prompt execution

## 🔮 Future Enhancements

### **Planned Features**
- **Version Comparison**: Side-by-side diff view
- **Branching**: Create branches from versions
- **Collaboration**: Share prompts with team members
- **Templates**: Save and reuse prompt templates
- **Export/Import**: Backup and restore prompts
- **Search**: Full-text search across prompts
- **Tags**: Organize prompts with tags
- **Analytics**: Usage statistics and insights

### **Technical Improvements**
- **Real-time Collaboration**: WebSocket support
- **Offline Support**: Service worker caching
- **Advanced Search**: Elasticsearch integration
- **File Versioning**: Track file changes over time
- **API Rate Limiting**: Protect against abuse
- **Audit Logging**: Track all user actions

## 📝 Migration Guide

### **From Old Prompt Editor**
1. Run database migration: `python migrate_prompt_versions.py`
2. Update frontend routing to use PromptWorkspace
3. Test all functionality
4. Remove old PromptEditor component

### **Database Migration**
```bash
cd backend
python migrate_prompt_versions.py
```

### **Frontend Updates**
- Replace PromptEditor with PromptWorkspace
- Add PromptProvider to App.js
- Update navigation links
- Test all features

## 🐛 Troubleshooting

### **Common Issues**
- **Version not saving**: Check database permissions
- **Files not uploading**: Verify file type support
- **Output not displaying**: Check API response format
- **State not persisting**: Verify localStorage access

### **Debug Mode**
Enable debug logging in browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## 📚 API Documentation

See `backend/API_DOCUMENTATION.md` for complete API reference.

## 🤝 Contributing

When adding new features:
1. Update database schema if needed
2. Add API endpoints
3. Update frontend components
4. Add tests
5. Update documentation
6. Test migration scripts
