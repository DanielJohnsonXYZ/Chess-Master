class ChessApp {
    constructor() {
        this.chessEngine = new ChessEngine();
        this.aiTutor = new AITutor();
        this.chessAI = new ChessAI(3); // Default difficulty level 3
        this.playingAgainstAI = false;
        this.theme = localStorage.getItem('chess-theme') || 'dark';
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.initializeTheme();
        this.chessEngine.renderBoard();
        this.chessEngine.updateGameInfo();
        
        // Make components globally accessible
        window.aiTutor = this.aiTutor;
        window.chessApp = this;
        
        // Wait for auth manager to initialize
        setTimeout(async () => {
            await this.loadPlayerProgress();
        }, 1000);
    }
    
    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeToggle();
    }
    
    setupEventListeners() {
        // New game button
        document.getElementById('new-game').addEventListener('click', () => {
            this.startNewGame();
        });
        
        // Force reset button (for debugging)
        const forceResetBtn = document.getElementById('force-reset');
        if (forceResetBtn) {
            forceResetBtn.addEventListener('click', () => {
                this.forceReset();
            });
        }
        
        // Analyze game button
        document.getElementById('analyze-game').addEventListener('click', () => {
            this.analyzeCurrentGame();
        });
        
        // Play AI button
        document.getElementById('play-ai').addEventListener('click', () => {
            this.toggleAIMode();
        });
        
        // AI settings button
        document.getElementById('ai-settings').addEventListener('click', () => {
            this.showAISettings();
        });
        
        // Theme toggle button
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                this.startNewGame();
            }
            
            if (e.key === 'a' && e.ctrlKey) {
                e.preventDefault();
                this.analyzeCurrentGame();
            }
            
            if (e.key === 't' && e.ctrlKey) {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }
    
    startNewGame() {
        try {
            console.log('Starting new game...');
            
            // Save current game to history if it has moves
            if (this.chessEngine && this.chessEngine.moveHistory && this.chessEngine.moveHistory.length > 0) {
                this.saveGameToHistory();
            }
            
            // Reset game state
            if (this.chessEngine) {
                this.chessEngine.newGame();
            } else {
                console.error('Chess engine not initialized');
                this.chessEngine = new ChessEngine();
            }
            
            if (this.aiTutor) {
                this.aiTutor.startNewGame();
            }
            
            // Update pattern insights
            this.updatePatternInsights();
            
            // Hide force reset button if visible
            const forceResetBtn = document.getElementById('force-reset');
            if (forceResetBtn) {
                forceResetBtn.style.display = 'none';
            }
            
            console.log('New game started successfully');
        } catch (error) {
            console.error('Error starting new game:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'App New Game');
            }
            
            // Show force reset button if something is broken
            const forceResetBtn = document.getElementById('force-reset');
            if (forceResetBtn) {
                forceResetBtn.style.display = 'inline-flex';
            }
            
            // Try to force reinitialize if something is broken
            try {
                this.chessEngine = new ChessEngine();
                this.chessEngine.renderBoard();
            } catch (reinitError) {
                console.error('Failed to reinitialize chess engine:', reinitError);
            }
        }
    }

    forceReset() {
        try {
            console.log('Force resetting entire application...');
            
            // Clear all localStorage
            localStorage.removeItem('chessAITutorHistory');
            localStorage.removeItem('chessAITutorPatterns');
            localStorage.removeItem('chess-theme');
            
            // Recreate all components from scratch
            this.chessEngine = new ChessEngine();
            this.aiTutor = new AITutor();
            this.chessAI = new ChessAI(3);
            this.playingAgainstAI = false;
            
            // Re-render everything
            this.chessEngine.renderBoard();
            this.chessEngine.updateGameInfo();
            this.chessEngine.updateCapturedPieces();
            this.chessEngine.updateMoveHistory();
            
            // Clear feedback
            const feedbackElement = document.getElementById('tutor-feedback');
            if (feedbackElement) {
                feedbackElement.innerHTML = '<p>Application reset! Ready for a fresh start.</p>';
            }
            
            // Clear pattern insights
            const patternsElement = document.getElementById('pattern-insights');
            if (patternsElement) {
                patternsElement.innerHTML = '<p>Play more games to unlock pattern analysis!</p>';
            }
            
            // Hide force reset button
            const forceResetBtn = document.getElementById('force-reset');
            if (forceResetBtn) {
                forceResetBtn.style.display = 'none';
            }
            
            // Update global references
            window.aiTutor = this.aiTutor;
            window.chessApp = this;
            
            console.log('Force reset completed successfully');
            
            if (window.errorHandler) {
                window.errorHandler.notifyUser('Application reset successfully!', 'success');
            }
            
        } catch (error) {
            console.error('Force reset failed:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'Force Reset');
            }
            
            // Last resort - reload the page
            if (confirm('Reset failed. Reload the page?')) {
                window.location.reload();
            }
        }
    }
    
    async analyzeCurrentGame() {
        if (this.chessEngine.moveHistory.length === 0) {
            this.showFeedback('No moves to analyze yet!', 'info');
            return;
        }
        
        // Try enhanced AI analysis first
        if (window.enhancedAI) {
            try {
                this.showFeedback('Analyzing your game with AI...', 'info');
                const patterns = await window.enhancedAI.analyzePlayerPatterns(this.chessEngine.moveHistory);
                this.displayEnhancedGameAnalysis(patterns);
                return;
            } catch (error) {
                console.log('Enhanced analysis failed, using basic analysis');
            }
        }
        
        // Fallback to basic analysis
        const gameAnalysis = this.aiTutor.analyzeGame(this.chessEngine.moveHistory);
        this.displayGameAnalysis(gameAnalysis);
    }
    
    displayGameAnalysis(analysis) {
        const feedbackElement = document.getElementById('tutor-feedback');
        
        const qualityColor = this.getQualityColor(analysis.averageMoveQuality);
        
        const analysisHtml = `
            <div class="game-analysis">
                <h4>Game Analysis</h4>
                <div class="analysis-stats">
                    <div class="stat">
                        <strong>Total Moves:</strong> ${analysis.totalMoves}
                    </div>
                    <div class="stat">
                        <strong>Average Quality:</strong> 
                        <span style="color: ${qualityColor}; font-weight: bold;">
                            ${analysis.averageMoveQuality.toFixed(1)}/100
                        </span>
                    </div>
                    <div class="stat">
                        <strong>Strong Moves:</strong> ${analysis.strongMoves}
                    </div>
                    <div class="stat">
                        <strong>Mistakes:</strong> ${analysis.mistakeCount}
                    </div>
                    <div class="stat">
                        <strong>Tactical Opportunities:</strong> ${analysis.tacticalOpportunities}
                    </div>
                </div>
                
                ${analysis.suggestions.length > 0 ? `
                    <div class="game-suggestions">
                        <strong>Improvement Areas:</strong>
                        <ul>
                            ${analysis.suggestions.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="analysis-rating">
                    <strong>Overall Performance:</strong> ${this.getPerformanceRating(analysis.averageMoveQuality)}
                </div>
            </div>
        `;
        
        feedbackElement.innerHTML = analysisHtml;
        
        // Save game analysis to history
        this.saveGameToHistory(analysis);
    }
    
    displayEnhancedGameAnalysis(patterns) {
        const feedbackElement = document.getElementById('tutor-feedback');
        
        const styleColors = {
            aggressive: '#ef4444',
            positional: '#3b82f6',
            tactical: '#f59e0b',
            balanced: '#22c55e',
            developing: '#6b7280'
        };
        
        const styleColor = styleColors[patterns.playingStyle] || '#6b7280';
        
        const analysisHtml = `
            <div class="enhanced-analysis">
                <h4 style="margin-bottom: 16px;">AI-Powered Game Analysis</h4>
                
                <div class="analysis-section" style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <strong>Playing Style:</strong>
                        <span style="color: ${styleColor}; font-weight: 600; text-transform: capitalize;">
                            ${patterns.playingStyle}
                        </span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Skill Level:</strong> 
                        <span style="text-transform: capitalize;">${patterns.skillLevel}</span>
                    </div>
                </div>
                
                ${patterns.strengths.length > 0 ? `
                    <div class="analysis-section" style="margin-bottom: 16px;">
                        <strong style="color: #22c55e;">🎯 Strengths:</strong>
                        <ul style="margin: 4px 0 0 20px; font-size: 0.875rem;">
                            ${patterns.strengths.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${patterns.weaknesses.length > 0 ? `
                    <div class="analysis-section" style="margin-bottom: 16px;">
                        <strong style="color: #f59e0b;">⚠️ Areas to Improve:</strong>
                        <ul style="margin: 4px 0 0 20px; font-size: 0.875rem;">
                            ${patterns.weaknesses.map(w => `<li>${w}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${patterns.patterns.length > 0 ? `
                    <div class="analysis-section" style="margin-bottom: 16px;">
                        <strong>🔍 Patterns Identified:</strong>
                        <ul style="margin: 4px 0 0 20px; font-size: 0.875rem;">
                            ${patterns.patterns.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${patterns.recommendations.length > 0 ? `
                    <div class="analysis-section" style="background: var(--color-accent-subtle); padding: 12px; border-radius: 8px; margin-top: 16px;">
                        <strong>🚀 Personalized Recommendations:</strong>
                        <ul style="margin: 8px 0 0 20px; font-size: 0.875rem;">
                            ${patterns.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        feedbackElement.innerHTML = analysisHtml;
        
        // Save enhanced analysis to history
        this.saveGameToHistory({ enhancedAnalysis: patterns });
    }
    
    getQualityColor(quality) {
        if (quality >= 80) return '#48bb78';
        if (quality >= 65) return '#68d391';
        if (quality >= 50) return '#fbd38d';
        if (quality >= 35) return '#f6ad55';
        return '#fc8181';
    }
    
    getPerformanceRating(quality) {
        if (quality >= 85) return 'Excellent! 🏆';
        if (quality >= 75) return 'Very Good! 👏';
        if (quality >= 65) return 'Good 👍';
        if (quality >= 50) return 'Average 📊';
        if (quality >= 35) return 'Below Average 📈';
        return 'Needs Improvement 💪';
    }
    
    async saveGameToHistory(analysis = null) {
        const gameData = {
            id: Date.now(),
            date: new Date().toISOString(),
            moves: this.chessEngine.moveHistory,
            analysis: analysis,
            finalPosition: this.chessEngine.board
        };
        
        const history = await this.aiTutor.loadGameHistory();
        history.push(gameData);
        
        // Keep only last 50 games
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
        
        await this.aiTutor.saveGameHistory(history);
        
        // Update player patterns based on this game
        this.updatePlayerPatternsFromGame(gameData);
    }
    
    async updatePlayerPatternsFromGame(gameData) {
        // This will be called by the AI tutor during move analysis
        // but we can also do bulk pattern updates here
        const patterns = this.aiTutor.playerPatterns;
        
        // Track game outcomes and lengths
        if (!patterns.gameStats) patterns.gameStats = {};
        patterns.gameStats.totalGames = (patterns.gameStats.totalGames || 0) + 1;
        patterns.gameStats.totalMoves = (patterns.gameStats.totalMoves || 0) + gameData.moves.length;
        patterns.gameStats.averageGameLength = patterns.gameStats.totalMoves / patterns.gameStats.totalGames;
        
        // Track time periods when games are played
        const hour = new Date(gameData.date).getHours();
        if (!patterns.playingTimes) patterns.playingTimes = {};
        patterns.playingTimes[hour] = (patterns.playingTimes[hour] || 0) + 1;
        
        await this.aiTutor.savePlayerPatterns(patterns);
    }
    
    async loadPlayerProgress() {
        // Load and display existing pattern insights
        await this.updatePatternInsights();
        
        // Show welcome message or returning player message
        const history = await this.aiTutor.loadGameHistory();
        const patterns = this.aiTutor.playerPatterns;
        
        if (history.length > 0) {
            const totalGames = patterns.gameStats?.totalGames || history.length;
            const welcomeMessage = `Welcome back! You've played ${totalGames} games. Ready for another?`;
            
            setTimeout(() => {
                this.showFeedback(welcomeMessage, 'info');
            }, 1000);
        }
    }
    
    async updatePatternInsights() {
        const patternElement = document.getElementById('pattern-insights');
        if (!patternElement) return;
        
        const history = await this.aiTutor.loadGameHistory();
        
        if (history.length < 2) {
            patternElement.innerHTML = '<p class="text-sm">Play more games to unlock pattern analysis!</p>';
            return;
        }
        
        // Try enhanced pattern analysis
        if (window.enhancedAI) {
            try {
                const patterns = await window.enhancedAI.analyzePlayerPatterns(history);
                this.displayPatternInsights(patterns);
                return;
            } catch (error) {
                console.log('Enhanced pattern analysis failed, using basic analysis');
            }
        }
        
        // Fallback to basic pattern analysis
        this.aiTutor.analyzePlayerPatterns();
    }
    
    displayPatternInsights(patterns) {
        const patternElement = document.getElementById('pattern-insights');
        if (!patternElement) return;
        
        const styleColors = {
            aggressive: '#ef4444',
            positional: '#3b82f6', 
            tactical: '#f59e0b',
            balanced: '#22c55e',
            developing: '#6b7280'
        };
        
        const styleColor = styleColors[patterns.playingStyle] || '#6b7280';
        
        const patternHtml = `
            <div class="pattern-summary">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <strong>Style:</strong>
                    <span style="color: ${styleColor}; font-weight: 600; text-transform: capitalize;">
                        ${patterns.playingStyle}
                    </span>
                </div>
                
                ${patterns.strengths.length > 0 ? `
                    <div class="insight-item insight-strength">
                        <strong>Top Strength:</strong> ${patterns.strengths[0]}
                    </div>
                ` : ''}
                
                ${patterns.weaknesses.length > 0 ? `
                    <div class="insight-item insight-weakness">
                        <strong>Focus Area:</strong> ${patterns.weaknesses[0]}
                    </div>
                ` : ''}
                
                ${patterns.recommendations.length > 0 ? `
                    <div class="insight-item" style="background: var(--color-accent-subtle); padding: 8px; border-radius: 6px; margin-top: 8px;">
                        <strong>Next Goal:</strong> ${patterns.recommendations[0]}
                    </div>
                ` : ''}
            </div>
        `;
        
        patternElement.innerHTML = patternHtml;
    }
    
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('chess-theme', this.theme);
        this.updateThemeToggle();
        
        // Add a subtle animation
        document.body.style.transition = 'background-color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }
    
    updateThemeToggle() {
        const toggleButton = document.getElementById('theme-toggle');
        const svg = toggleButton.querySelector('svg');
        
        if (this.theme === 'dark') {
            // Light mode icon (sun)
            svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>`;
        } else {
            // Dark mode icon (moon)
            svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>`;
        }
        
        toggleButton.setAttribute('aria-label', `Switch to ${this.theme === 'dark' ? 'light' : 'dark'} theme`);
    }
    
    showFeedback(message, type = 'info') {
        const feedbackElement = document.getElementById('tutor-feedback');
        
        const typeColors = {
            info: '#4299e1',
            success: '#48bb78',
            warning: '#ed8936',
            error: '#f56565'
        };
        
        const feedbackHtml = `
            <div class="feedback-message" style="border-left: 4px solid ${typeColors[type]};">
                <p>${message}</p>
            </div>
        `;
        
        feedbackElement.innerHTML = feedbackHtml;
    }
    
    toggleAIMode() {
        this.playingAgainstAI = !this.playingAgainstAI;
        const buttonText = document.getElementById('ai-mode-text');
        const button = document.getElementById('play-ai');
        
        if (this.playingAgainstAI) {
            buttonText.textContent = 'Stop AI';
            button.classList.add('btn-danger');
            button.classList.remove('btn-accent');
            
            // Start new game if current game has moves
            if (this.chessEngine.moveHistory.length > 0) {
                this.startNewGame();
            }
            
            // If AI plays as black and it's white's turn, let human play
            // If AI plays as white, make AI move immediately
            if (this.chessAI.color === 'white' && this.chessEngine.currentPlayer === 'white') {
                setTimeout(() => {
                    this.chessAI.makeMove(this.chessEngine);
                }, 500);
            }
            
            this.showFeedback('Playing against AI - Good luck!', 'success');
        } else {
            buttonText.textContent = 'Play AI';
            button.classList.remove('btn-danger');
            button.classList.add('btn-accent');
            this.showFeedback('AI opponent disabled', 'info');
        }
    }
    
    setAIDifficulty(level) {
        this.chessAI.setDifficulty(level);
        this.showFeedback(`AI difficulty set to ${level}`, 'success');
    }
    
    setAIColor(color) {
        this.chessAI.setColor(color);
        
        // If switching to white and it's currently white's turn, make AI move
        if (color === 'white' && this.chessEngine.currentPlayer === 'white' && this.playingAgainstAI && !this.chessEngine.gameOver) {
            setTimeout(() => {
                this.chessAI.makeMove(this.chessEngine);
            }, 500);
        }
        
        this.showFeedback(`AI now plays as ${color}`, 'success');
    }
    
    showAISettings() {
        const modal = document.getElementById('ai-settings-modal');
        const keyInput = document.getElementById('claude-key');
        const statusIndicator = document.getElementById('ai-status-indicator');
        
        // Show current API key status
        this.updateAIStatus();
        
        // Set up modal event listeners
        document.getElementById('close-modal').onclick = () => this.hideAISettings();
        document.getElementById('save-api-key').onclick = () => this.saveAPIKey();
        document.getElementById('remove-api-key').onclick = () => this.removeAPIKey();
        
        // AI settings event listeners
        document.getElementById('ai-difficulty').onchange = (e) => {
            this.setAIDifficulty(parseInt(e.target.value));
        };
        
        document.getElementById('ai-color').onchange = (e) => {
            this.setAIColor(e.target.value);
        };
        
        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) this.hideAISettings();
        };
        
        // Show modal with animation
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    hideAISettings() {
        const modal = document.getElementById('ai-settings-modal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }
    
    saveAPIKey() {
        const keyInput = document.getElementById('claude-key');
        const apiKey = keyInput.value.trim();
        
        if (!apiKey) {
            this.showFeedback('Please enter a valid API key', 'error');
            return;
        }
        
        if (!apiKey.startsWith('sk-ant-')) {
            this.showFeedback('Claude API key should start with "sk-ant-"', 'error');
            return;
        }
        
        // Save the key
        if (window.chessConfig) {
            const success = window.chessConfig.setClaudeKey(apiKey);
            if (success) {
                this.showFeedback('API key saved successfully! Enhanced AI feedback is now available.', 'success');
                this.updateAIStatus();
                keyInput.value = ''; // Clear the input for security
                this.hideAISettings();
            } else {
                this.showFeedback('Failed to save API key', 'error');
            }
        }
    }
    
    removeAPIKey() {
        if (window.chessConfig) {
            window.chessConfig.clearApiKey();
            this.showFeedback('API key removed. Using basic AI feedback.', 'info');
            this.updateAIStatus();
            this.hideAISettings();
        }
    }
    
    updateAIStatus() {
        const statusIndicator = document.getElementById('ai-status-indicator');
        if (!statusIndicator) return;
        
        const hasValidKey = window.chessConfig && window.chessConfig.hasValidApiKey();
        
        if (hasValidKey) {
            statusIndicator.textContent = '✅ Enhanced AI active - Claude-powered analysis enabled';
            statusIndicator.className = 'status-indicator connected';
        } else {
            statusIndicator.textContent = '⚠️ Basic AI only - Add Claude API key for enhanced feedback';
            statusIndicator.className = 'status-indicator disconnected';
        }
    }
    
    // Advanced features for future enhancement
    async exportGameHistory() {
        if (window.userDataService) {
            await window.userDataService.exportUserData();
            return;
        }
        
        const history = await this.aiTutor.loadGameHistory();
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'chess-games-history.json';
        link.click();
    }
    
    async importGameHistory(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (window.userDataService) {
                    const success = await window.userDataService.importUserData(e.target.result);
                    if (success) {
                        await this.updatePatternInsights();
                        this.showFeedback('Game data imported successfully!', 'success');
                    } else {
                        this.showFeedback('Error importing game data', 'error');
                    }
                } else {
                    const history = JSON.parse(e.target.result);
                    await this.aiTutor.saveGameHistory(history);
                    await this.updatePatternInsights();
                    this.showFeedback('Game history imported successfully!', 'success');
                }
            } catch (error) {
                this.showFeedback('Error importing game history', 'error');
            }
        };
        reader.readAsText(file);
    }
    
    async getPlayerStatistics() {
        const history = await this.aiTutor.loadGameHistory();
        const patterns = this.aiTutor.playerPatterns;
        
        const stats = {
            totalGames: history.length,
            averageMovesPerGame: 0,
            bestGame: null,
            worstGame: null,
            improvementTrend: 'stable'
        };
        
        if (history.length > 0) {
            stats.averageMovesPerGame = history.reduce((sum, game) => sum + game.moves.length, 0) / history.length;
            
            const gamesWithAnalysis = history.filter(game => game.analysis);
            if (gamesWithAnalysis.length > 0) {
                gamesWithAnalysis.sort((a, b) => b.analysis.averageMoveQuality - a.analysis.averageMoveQuality);
                stats.bestGame = gamesWithAnalysis[0];
                stats.worstGame = gamesWithAnalysis[gamesWithAnalysis.length - 1];
                
                // Calculate improvement trend
                if (gamesWithAnalysis.length >= 5) {
                    const recent = gamesWithAnalysis.slice(-5).reduce((sum, game) => sum + game.analysis.averageMoveQuality, 0) / 5;
                    const earlier = gamesWithAnalysis.slice(0, 5).reduce((sum, game) => sum + game.analysis.averageMoveQuality, 0) / 5;
                    
                    if (recent > earlier + 5) stats.improvementTrend = 'improving';
                    else if (recent < earlier - 5) stats.improvementTrend = 'declining';
                }
            }
        }
        
        return stats;
    }
}

// Global functions for advanced features
function exportGames() {
    if (window.chessApp) {
        window.chessApp.exportGameHistory();
    }
}

function importGames() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        if (window.chessApp) {
            window.chessApp.importGameHistory(e);
        }
    };
    input.click();
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chessApp = new ChessApp();
    console.log('Chess AI Tutor initialized successfully');
});