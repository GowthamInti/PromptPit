# 🔨 PromptPit

**AI Prompt Engineering & Testing Platform**

[![GitHub release](https://img.shields.io/github/release/GowthamInti/PromptPit.svg)](https://github.com/GowthamInti/PromptPit/releases)
[![GitHub stars](https://img.shields.io/github/stars/GowthamInti/PromptPit.svg)](https://github.com/GowthamInti/PromptPit/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/GowthamInti/PromptPit.svg)](https://github.com/GowthamInti/PromptPit/network)
[![GitHub issues](https://img.shields.io/github/issues/GowthamInti/PromptPit.svg)](https://github.com/GowthamInti/PromptPit/issues)
[![GitHub license](https://img.shields.io/github/license/GowthamInti/PromptPit.svg)](https://github.com/GowthamInti/PromptPit/blob/main/LICENSE)
[![Docker Build](https://img.shields.io/docker/build/gowthaminti/promptpit.svg)](https://hub.docker.com/r/gowthaminti/promptpit)
[![Docker Pulls](https://img.shields.io/docker/pulls/gowthaminti/promptpit.svg)](https://hub.docker.com/r/gowthaminti/promptpit)
[![Build Status](https://img.shields.io/github/workflow/status/GowthamInti/PromptPit/CI.svg)](https://github.com/GowthamInti/PromptPit/actions)

<div align="center">
  <img src="frontend/docs/images/PromptPit.PNG" alt="PromptPit Logo" width="200" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  <br><br>
  <img src="frontend/docs/images/forge.png" alt="PromptPit Interface" width="800" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
</div>

PromptPit is a powerful, self-hosted platform designed for AI researchers, developers, and prompt engineers to experiment, test, and optimize prompts across multiple Large Language Model (LLM) providers. Built with a gritty, battle-themed interface, PromptPit transforms prompt engineering into an engaging experience.

## 🚀 Features

- **Multi-Provider Support**: Add and manage OpenAI and Groq providers
- **Prompt Editor**: Create and run prompts with advanced settings
- **Output Viewer**: Browse and analyze all prompt outputs
- **Judge Evaluation**: Evaluate outputs using judge LLMs with custom criteria
- **Version History**: Compare different prompt versions and their performance
- **Model Cards**: Generate and export comprehensive experiment summaries
- **Modern UI**: Beautiful, responsive interface built with TailwindCSS

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks and functional components
- **TailwindCSS** - Utility-first CSS framework for rapid UI development
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Toast notifications
- **Heroicons** - Beautiful SVG icons
- **Headless UI** - Accessible UI components
- **PWA Support** - Progressive Web App with custom icons and manifest

## 📦 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🔧 Configuration

The frontend is configured to connect to your FastAPI backend running on `http://localhost:8000`. You can change this by setting the `REACT_APP_API_URL` environment variable.

Create a `.env` file in the root directory:
```env
REACT_APP_API_URL=http://localhost:8000
```

## 📱 Pages & Features

### Dashboard (`/`)
- Overview of providers and models
- Quick action cards for navigation
- Provider status and management
- Statistics and metrics

### Prompt Editor (`/editor`)
- Provider and model selection
- Prompt input with system prompts
- Advanced settings (temperature, max tokens)
- Real-time output display
- Copy functionality

### Outputs (`/outputs`)
- Browse all prompt outputs
- Search and filter functionality
- Detailed output view with metadata
- Copy outputs to clipboard

### Judge Evaluation (`/judge`)
- Select outputs for evaluation
- Configure judge provider and model
- Custom evaluation criteria
- Score and feedback display

### Version History (`/history`)
- View prompt versions
- Compare different versions
- Side-by-side comparison modal
- Performance metrics

### Model Cards (`/model-cards`)
- Generate model cards
- Export in multiple formats (JSON, Markdown, PDF)
- Share functionality
- Comprehensive metrics

## 🎨 UI Components

The frontend uses a consistent design system with:

- **Cards**: Clean, rounded containers for content
- **Buttons**: Primary, secondary, and status-specific button styles
- **Status Badges**: Color-coded status indicators
- **Modals**: Overlay dialogs for detailed views
- **Forms**: Consistent input styling with validation
- **Loading States**: Skeleton loaders and spinners

## 🔌 API Integration

The frontend integrates with your FastAPI backend through the following endpoints:

- `GET /api/providers` - List providers
- `POST /api/providers` - Add new provider
- `GET /api/models` - List available models
- `POST /api/run` - Execute prompts
- `POST /api/judge` - Run evaluations
- `GET /api/prompts` - List prompts
- `GET /api/health` - Health check

## 🚀 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts for state management
├── pages/              # Page components
├── services/           # API service functions
├── App.js              # Main app component
├── index.js            # Entry point
└── index.css           # Global styles
```

### Key Components

- **Layout**: Main layout with sidebar navigation
- **AddProviderModal**: Modal for adding new providers
- **ProviderContext**: Global state for providers and models

### State Management

The app uses React Context for global state management:
- Provider and model selection
- API communication
- Loading states

## 🎯 Getting Started

1. **Start your FastAPI backend** (make sure it's running on port 8000)

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Open your browser** to `http://localhost:3000`

5. **Add your first provider** using the dashboard

6. **Start experimenting** with prompts!

## 🔧 Customization

### Styling
The app uses TailwindCSS with custom components defined in `src/index.css`. You can customize:
- Color scheme in `tailwind.config.js`
- Component styles in the CSS file
- Button and form styles

### Adding New Providers
To add support for new LLM providers:
1. Update the provider list in `AddProviderModal.js`
2. Add provider-specific logic in the API service
3. Update the provider context if needed

### Adding New Pages
1. Create a new page component in `src/pages/`
2. Add the route to `src/App.js`
3. Add navigation item to `src/components/Layout.js`

## 🐛 Troubleshooting

### Common Issues

**Backend Connection Error:**
- Ensure your FastAPI backend is running on port 8000
- Check CORS settings in your backend
- Verify the API URL in your environment variables

**Provider Not Loading:**
- Check the backend API endpoints
- Verify API key format and permissions
- Check browser console for error messages

**Build Errors:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for version conflicts in `package.json`

## 📄 License

This project is part of PromptPit. See the main project license for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the backend documentation
- Open an issue on the project repository

---

**Happy Prompt Engineering! 🎯**
