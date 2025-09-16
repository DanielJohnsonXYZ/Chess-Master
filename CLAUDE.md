# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a pure JavaScript web application with no build system or package manager. All development is done directly with the source files:

- **Run the application**: Open `index.html` in a web browser
- **Testing**: Manual testing through browser interaction (no automated test suite)
- **Development**: Edit files directly and refresh browser to see changes

## Architecture Overview

### Core Components

The application follows a modular class-based architecture with three main components:

1. **ChessEngine** (`chess-engine.js`): Core chess game logic
   - Board state management and piece movement validation
   - Move history tracking and game state
   - Board rendering and UI interaction handling
   - Chess rule enforcement (including special moves like castling, en passant)

2. **AITutor** (`ai-tutor.js`): AI analysis and feedback system
   - Move quality evaluation and rating (0-100 scale)
   - Pattern recognition across games stored in localStorage
   - Feedback generation based on chess principles and common mistakes
   - Player progress tracking and improvement suggestions

3. **ChessApp** (`app.js`): Application controller and integration layer
   - Coordinates between ChessEngine and AITutor
   - Event handling for UI interactions
   - Theme management (dark/light mode)
   - Keyboard shortcuts (Ctrl+N for new game, Ctrl+A for analysis)

### Data Persistence

- **localStorage**: All game history, player patterns, and settings are stored in browser localStorage
- **Game History**: Up to 50 games retained for pattern analysis
- **Player Patterns**: Tracks strengths, weaknesses, and playing tendencies across sessions
- **Theme Settings**: User preference for dark/light mode

### UI Structure

- **Responsive Design**: Modern CSS with dark/light theme support
- **Component-based Layout**: Game board, AI feedback panel, pattern recognition display
- **Interactive Elements**: Click-to-move chess pieces with visual feedback for possible moves

### Key Integration Points

- `ChessApp.init()`: Entry point that initializes all components
- `window.aiTutor`: Global reference for cross-component AI access
- Event-driven architecture with DOM event listeners for user interactions
- Real-time feedback system that analyzes moves immediately after they're made

### File Dependencies

- `index.html` loads all JavaScript files and provides the UI structure
- `styles.css` contains all styling including theme variables and responsive design
- JavaScript files are loaded in order: config.js → chess-engine.js → chess-ai.js → ai-tutor.js → ai-enhanced.js → app.js
- No external dependencies or build tools required

### API Integration

- **Claude API Integration**: Enhanced AI analysis using Anthropic's Claude API
- **API Configuration**: `config.js` manages Claude API key and endpoint settings
- **Enhanced AI Tutor**: `ai-enhanced.js` provides advanced move analysis and pattern recognition
- **Fallback System**: Basic analysis available when no API key is provided
- **Rate Limiting**: 6-second minimum between API requests to respect usage limits

### Development Patterns

- ES6+ class syntax throughout
- localStorage APIs for data persistence
- DOM manipulation using vanilla JavaScript (no frameworks)
- Event-driven programming with addEventListener
- Object-oriented design with clear separation of concerns