// Configuration for Chess AI Tutor
class Config {
    constructor() {
        // For local development, you can set your API key here temporarily
        // In production, this should come from environment variables
        this.claudeApiKey = this.getClaudeKey();
        this.claudeEndpoint = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-3-haiku-20240307'; // Cost-effective model for chess analysis
        
        // Chess analysis settings
        this.maxAnalysisDepth = 5; // Number of moves to analyze
        this.patternRecognitionThreshold = 3; // Minimum games for pattern analysis
        
        // Rate limiting
        this.maxRequestsPerMinute = 10;
        this.requestQueue = [];
    }
    
    getClaudeKey() {
        // First check for environment variable (for production)
        if (typeof process !== 'undefined' && process.env && process.env.CLAUDE_API_KEY) {
            return process.env.CLAUDE_API_KEY;
        }
        
        // Check localStorage for development (NOT recommended for production)
        if (typeof localStorage !== 'undefined') {
            const storedKey = localStorage.getItem('chess_ai_claude_key');
            if (storedKey) {
                return storedKey;
            }
        }
        
        // Return null if no key is found
        return null;
    }
    
    setClaudeKey(apiKey) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chess_ai_claude_key', apiKey);
            this.claudeApiKey = apiKey;
            return true;
        }
        return false;
    }
    
    hasValidApiKey() {
        return this.claudeApiKey && this.claudeApiKey.startsWith('sk-ant-');
    }
    
    clearApiKey() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('chess_ai_claude_key');
        }
        this.claudeApiKey = null;
    }
}

// Global config instance
window.chessConfig = new Config();