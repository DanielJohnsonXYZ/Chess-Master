class ChessApp {
    constructor() {
        this.chessEngine = new ChessEngine();
        this.aiTutor = new AITutor();
        this.theme = localStorage.getItem('chess-theme') || 'dark';
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeTheme();
        this.chessEngine.renderBoard();
        this.chessEngine.updateGameInfo();
        
        // Make AI tutor globally accessible
        window.aiTutor = this.aiTutor;
        
        // Load and display player patterns
        this.loadPlayerProgress();
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
        
        // Analyze game button
        document.getElementById('analyze-game').addEventListener('click', () => {
            this.analyzeCurrentGame();
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
        // Save current game to history if it has moves
        if (this.chessEngine.moveHistory.length > 0) {
            this.saveGameToHistory();
        }
        
        // Reset game state
        this.chessEngine.newGame();
        this.aiTutor.startNewGame();
        
        // Update pattern insights
        this.updatePatternInsights();
        
        console.log('New game started');
    }
    
    analyzeCurrentGame() {
        if (this.chessEngine.moveHistory.length === 0) {
            this.showFeedback('No moves to analyze yet!', 'info');
            return;
        }
        
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
    
    saveGameToHistory(analysis = null) {
        const gameData = {
            id: Date.now(),
            date: new Date().toISOString(),
            moves: this.chessEngine.moveHistory,
            analysis: analysis,
            finalPosition: this.chessEngine.board
        };
        
        const history = this.aiTutor.loadGameHistory();
        history.push(gameData);
        
        // Keep only last 50 games
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
        
        this.aiTutor.saveGameHistory(history);
        
        // Update player patterns based on this game
        this.updatePlayerPatternsFromGame(gameData);
    }
    
    updatePlayerPatternsFromGame(gameData) {
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
        
        this.aiTutor.savePlayerPatterns(patterns);
    }
    
    loadPlayerProgress() {
        // Load and display existing pattern insights
        this.updatePatternInsights();
        
        // Show welcome message or returning player message
        const history = this.aiTutor.loadGameHistory();
        const patterns = this.aiTutor.playerPatterns;
        
        if (history.length > 0) {
            const totalGames = patterns.gameStats?.totalGames || history.length;
            const welcomeMessage = `Welcome back! You've played ${totalGames} games. Ready for another?`;
            
            setTimeout(() => {
                this.showFeedback(welcomeMessage, 'info');
            }, 1000);
        }
    }
    
    updatePatternInsights() {
        // This triggers the pattern analysis and updates the display
        this.aiTutor.analyzePlayerPatterns();
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
        const icon = toggleButton.querySelector('span');
        icon.textContent = this.theme === 'dark' ? 'light_mode' : 'dark_mode';
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
    
    // Advanced features for future enhancement
    exportGameHistory() {
        const history = this.aiTutor.loadGameHistory();
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'chess-games-history.json';
        link.click();
    }
    
    importGameHistory(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const history = JSON.parse(e.target.result);
                this.aiTutor.saveGameHistory(history);
                this.updatePatternInsights();
                this.showFeedback('Game history imported successfully!', 'success');
            } catch (error) {
                this.showFeedback('Error importing game history', 'error');
            }
        };
        reader.readAsText(file);
    }
    
    getPlayerStatistics() {
        const history = this.aiTutor.loadGameHistory();
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