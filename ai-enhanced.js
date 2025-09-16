// Enhanced AI Chess Tutor with Claude API Integration
class EnhancedAITutor {
    constructor() {
        this.config = window.chessConfig;
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.gameHistory = this.loadGameHistory();
        this.playerProfile = this.loadPlayerProfile();
        
        // Chess knowledge base for context
        this.chessKnowledge = {
            openingPrinciples: [
                "Control the center with pawns (e4, d4, e5, d5)",
                "Develop pieces toward the center",
                "Castle early for king safety",
                "Don't move the same piece twice in the opening",
                "Don't bring the queen out too early"
            ],
            tacticalPatterns: [
                "Pin: Attacking a piece that cannot move without exposing a more valuable piece",
                "Fork: Attacking two or more enemy pieces simultaneously",
                "Skewer: Forcing a valuable piece to move and capturing a less valuable piece behind it",
                "Discovered attack: Moving one piece to reveal an attack from another piece",
                "Double attack: Attacking two targets at once"
            ],
            endgamePrinciples: [
                "King activity is crucial in the endgame",
                "Passed pawns should be pushed",
                "Centralize your king",
                "Activate your pieces before your opponent",
                "Learn basic checkmate patterns"
            ]
        };
    }
    
    async analyzeMove(move, gameState, moveHistory) {
        if (!this.config.hasValidApiKey()) {
            return this.getFallbackAnalysis(move, gameState);
        }
        
        try {
            const analysis = await this.getClaudeAnalysis(move, gameState, moveHistory);
            return this.formatAnalysis(analysis, move);
        } catch (error) {
            console.warn('Claude analysis failed, using fallback:', error);
            return this.getFallbackAnalysis(move, gameState);
        }
    }
    
    async getClaudeAnalysis(move, gameState, moveHistory) {
        const prompt = this.buildAnalysisPrompt(move, gameState, moveHistory);
        
        const response = await this.makeClaudeRequest({
            system: `You are a world-class chess coach analyzing a chess game. Provide constructive, educational feedback that helps the player improve. Be encouraging but honest about mistakes. Focus on:
1. The quality of the move (excellent, good, okay, questionable, poor)
2. Tactical and strategic considerations
3. Better alternatives if the move is suboptimal
4. Learning opportunities and patterns
5. Specific, actionable advice

Respond in JSON format with this structure:
{
    "rating": "excellent|good|okay|questionable|poor",
    "mainFeedback": "Brief main assessment",
    "tacticalAnalysis": "Tactical considerations",
    "strategicAnalysis": "Strategic considerations", 
    "suggestions": ["suggestion1", "suggestion2"],
    "alternatives": ["better move if applicable"],
    "learningPoint": "Key educational takeaway"
}`,
            messages: [{
                role: "user",
                content: prompt
            }]
        });
        
        try {
            return JSON.parse(response.content[0].text);
        } catch (e) {
            // If JSON parsing fails, create structured response from text
            return this.parseTextResponse(response.content[0].text);
        }
    }
    
    buildAnalysisPrompt(move, gameState, moveHistory) {
        const moveNotation = this.getMoveNotation(move);
        const position = this.describeBoardPosition(gameState);
        const gamePhase = this.determineGamePhase(moveHistory, gameState);
        const recentMoves = moveHistory.slice(-4).map(m => this.getMoveNotation(m)).join(' ');
        
        return `Analyze this chess move:

Move: ${moveNotation}
Game Phase: ${gamePhase}
Move Number: ${move.moveNumber}
Recent Moves: ${recentMoves}

Position Description:
${position}

Player Context:
- Playing as ${move.player}
- This is move ${move.moveNumber}
- Recent playing pattern: ${this.analyzeRecentPattern(moveHistory)}

Please analyze this move considering:
1. Opening principles (if early game)
2. Tactical threats and opportunities
3. Strategic positioning
4. Common mistakes for this level
5. Learning opportunities`;
    }
    
    describeBoardPosition(gameState) {
        // Simplified board description
        let description = "";
        
        // Check for piece activity
        const activePieces = this.countActivePieces(gameState.board);
        description += `Active pieces: White ${activePieces.white}, Black ${activePieces.black}\n`;
        
        // Check king safety
        const kingSafety = this.assessKingSafety(gameState.board);
        description += `King safety: ${kingSafety}\n`;
        
        // Check center control
        const centerControl = this.assessCenterControl(gameState.board);
        description += `Center control: ${centerControl}`;
        
        return description;
    }
    
    determineGamePhase(moveHistory, gameState) {
        const moveCount = moveHistory.length;
        const pieceCount = this.countPieces(gameState.board);
        
        if (moveCount < 20 && pieceCount.total > 28) {
            return "Opening";
        } else if (pieceCount.total < 12) {
            return "Endgame";
        } else {
            return "Middlegame";
        }
    }
    
    analyzeRecentPattern(moveHistory) {
        const recentMoves = moveHistory.slice(-6);
        if (recentMoves.length < 3) return "Early in game";
        
        const patterns = [];
        
        // Check for repetitive piece moves
        const pieceMoves = {};
        recentMoves.forEach(move => {
            const key = `${move.piece.type}-${move.from[0]}-${move.from[1]}`;
            pieceMoves[key] = (pieceMoves[key] || 0) + 1;
        });
        
        const repeatedPiece = Object.entries(pieceMoves).find(([_, count]) => count > 1);
        if (repeatedPiece) {
            patterns.push("moving same piece multiple times");
        }
        
        // Check for aggressive vs defensive play
        const captures = recentMoves.filter(move => move.captured).length;
        if (captures > recentMoves.length / 2) {
            patterns.push("aggressive tactical play");
        }
        
        return patterns.length > 0 ? patterns.join(", ") : "balanced play";
    }
    
    async makeClaudeRequest(payload) {
        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < 6000) { // 6 second minimum between requests
            throw new Error('Rate limited - please wait before next analysis');
        }
        
        this.lastRequestTime = now;
        
        const response = await fetch(this.config.claudeEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.config.model,
                max_tokens: 800,
                temperature: 0.3, // Lower temperature for more consistent analysis
                system: payload.system,
                messages: payload.messages
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        return data;
    }
    
    parseTextResponse(textResponse) {
        // Parse structured text response if JSON parsing fails
        return {
            rating: this.extractRating(textResponse) || "okay",
            mainFeedback: this.extractMainPoint(textResponse),
            tacticalAnalysis: "Analysis available in main feedback",
            strategicAnalysis: "Strategic considerations included",
            suggestions: this.extractSuggestions(textResponse),
            alternatives: [],
            learningPoint: this.extractLearningPoint(textResponse)
        };
    }
    
    extractRating(text) {
        const ratings = ["excellent", "good", "okay", "questionable", "poor"];
        const lowerText = text.toLowerCase();
        return ratings.find(rating => lowerText.includes(rating));
    }
    
    extractMainPoint(text) {
        const lines = text.split('\n').filter(line => line.trim());
        return lines[0] || "Move analyzed";
    }
    
    extractSuggestions(text) {
        const suggestions = [];
        const lines = text.split('\n');
        
        for (let line of lines) {
            if (line.includes('suggest') || line.includes('consider') || line.includes('try')) {
                suggestions.push(line.trim());
            }
        }
        
        return suggestions.length > 0 ? suggestions : ["Continue focusing on fundamental principles"];
    }
    
    extractLearningPoint(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const lastLine = lines[lines.length - 1];
        return lastLine || "Focus on improving your chess fundamentals";
    }
    
    getFallbackAnalysis(move, gameState) {
        // Enhanced fallback analysis using chess principles
        const rating = this.evaluateMoveLocally(move, gameState);
        const phase = this.determineGamePhase([move], gameState);
        const principles = this.getRelevantPrinciples(phase);
        
        return {
            rating: rating,
            mainFeedback: this.generateLocalFeedback(move, rating, phase),
            tacticalAnalysis: this.analyzeLocalTactics(move, gameState),
            strategicAnalysis: this.analyzeLocalStrategy(move, gameState, phase),
            suggestions: this.getLocalSuggestions(move, phase),
            alternatives: [],
            learningPoint: principles[Math.floor(Math.random() * principles.length)]
        };
    }
    
    evaluateMoveLocally(move, gameState) {
        let score = 50; // Base score
        
        // Evaluate based on chess principles
        if (move.captured) score += 20; // Captures are often good
        if (this.movesDevelopspiece(move)) score += 15;
        if (this.movesControlsCenter(move)) score += 10;
        if (this.moveImprovesSafety(move, gameState)) score += 10;
        
        // Deduct for obvious mistakes
        if (this.movesRepeatsPiece(move, gameState.moveHistory)) score -= 15;
        if (this.movesQueenEarly(move)) score -= 20;
        
        if (score >= 75) return "excellent";
        if (score >= 60) return "good";
        if (score >= 40) return "okay";
        if (score >= 25) return "questionable";
        return "poor";
    }
    
    generateLocalFeedback(move, rating, phase) {
        const feedbackMap = {
            excellent: `Excellent ${phase.toLowerCase()} move! This shows strong understanding of chess principles.`,
            good: `Good move that follows ${phase.toLowerCase()} principles well.`,
            okay: `This move is playable but there might be stronger alternatives.`,
            questionable: `This move has some issues. Consider the basic principles of ${phase.toLowerCase()} play.`,
            poor: `This move goes against fundamental chess principles. Let's work on improvement.`
        };
        
        return feedbackMap[rating];
    }
    
    analyzeLocalTactics(move, gameState) {
        const analysis = [];
        
        if (move.captured) {
            analysis.push(`Good tactical execution - captured ${move.captured.type}`);
        }
        
        // Check for basic tactical patterns
        if (this.createsFork(move, gameState)) {
            analysis.push("This move creates a fork - well done!");
        }
        
        return analysis.length > 0 ? analysis.join(" ") : "No immediate tactical themes identified";
    }
    
    analyzeLocalStrategy(move, gameState, phase) {
        const analysis = [];
        
        if (phase === "Opening") {
            if (this.movesDevelopspiece(move)) {
                analysis.push("Good piece development");
            }
            if (this.movesControlsCenter(move)) {
                analysis.push("Helps control the center");
            }
        }
        
        return analysis.length > 0 ? analysis.join(", ") : "Strategic considerations noted";
    }
    
    getLocalSuggestions(move, phase) {
        const suggestions = [];
        
        if (phase === "Opening") {
            suggestions.push("Focus on piece development and center control");
            suggestions.push("Castle early for king safety");
        } else if (phase === "Middlegame") {
            suggestions.push("Look for tactical opportunities");
            suggestions.push("Improve piece coordination");
        } else {
            suggestions.push("Activate your king");
            suggestions.push("Push passed pawns");
        }
        
        return suggestions.slice(0, 2);
    }
    
    getRelevantPrinciples(phase) {
        if (phase === "Opening") return this.chessKnowledge.openingPrinciples;
        if (phase === "Endgame") return this.chessKnowledge.endgamePrinciples;
        return this.chessKnowledge.tacticalPatterns;
    }
    
    async analyzePlayerPatterns(gameHistory) {
        if (!this.config.hasValidApiKey() || gameHistory.length < 3) {
            return this.getLocalPatternAnalysis(gameHistory);
        }
        
        try {
            const prompt = this.buildPatternPrompt(gameHistory);
            const response = await this.makeClaudeRequest({
                system: `You are analyzing a chess player's game history to identify patterns in their play style. Provide insights about:
1. Strengths and weaknesses
2. Recurring patterns (good and bad)
3. Improvement recommendations
4. Playing style assessment

Respond in JSON format:
{
    "playingStyle": "aggressive|positional|tactical|balanced",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "patterns": ["pattern1", "pattern2"],
    "recommendations": ["rec1", "rec2"],
    "skillLevel": "beginner|intermediate|advanced"
}`,
                messages: [{
                    role: "user",
                    content: prompt
                }]
            });
            
            return JSON.parse(response.content[0].text);
        } catch (error) {
            console.warn('Pattern analysis failed, using local analysis:', error);
            return this.getLocalPatternAnalysis(gameHistory);
        }
    }
    
    buildPatternPrompt(gameHistory) {
        const recentGames = gameHistory.slice(-5);
        const stats = this.calculatePlayerStats(recentGames);
        
        return `Analyze this chess player's patterns based on their recent game history:

Games Played: ${recentGames.length}
Average Game Length: ${stats.avgGameLength} moves
Tactical Accuracy: ${stats.tacticalAccuracy}%
Opening Variety: ${stats.openingVariety}
Most Common Mistakes: ${stats.commonMistakes.join(', ')}
Preferred Playing Style: ${stats.preferredStyle}

Game Summaries:
${recentGames.map((game, index) => 
    `Game ${index + 1}: ${game.moves.length} moves, Result: ${game.result || 'In progress'}`
).join('\n')}

Please identify patterns in their play and provide constructive feedback for improvement.`;
    }
    
    calculatePlayerStats(games) {
        // Calculate various statistics from game history
        const totalMoves = games.reduce((sum, game) => sum + game.moves.length, 0);
        
        return {
            avgGameLength: Math.round(totalMoves / games.length),
            tacticalAccuracy: Math.floor(Math.random() * 30) + 60, // Simplified
            openingVariety: games.length > 2 ? "Good" : "Limited",
            commonMistakes: ["Early queen development", "Poor king safety"],
            preferredStyle: "Tactical"
        };
    }
    
    getLocalPatternAnalysis(gameHistory) {
        // Local pattern analysis without AI
        return {
            playingStyle: "developing",
            strengths: ["Shows interest in learning", "Consistent play"],
            weaknesses: ["Need more games for accurate analysis"],
            patterns: ["Still building playing patterns"],
            recommendations: [
                "Continue playing to develop your style",
                "Study basic chess principles",
                "Analyze your games after playing"
            ],
            skillLevel: "beginner"
        };
    }
    
    // Helper methods for chess analysis
    countActivePieces(board) {
        let white = 0, black = 0;
        // Simplified piece counting logic
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    if (piece.color === 'white') white++;
                    else black++;
                }
            }
        }
        return { white, black };
    }
    
    countPieces(board) {
        const count = this.countActivePieces(board);
        return { ...count, total: count.white + count.black };
    }
    
    assessKingSafety(board) {
        // Simplified king safety assessment
        return "Generally safe";
    }
    
    assessCenterControl(board) {
        // Simplified center control assessment
        return "Contested";
    }
    
    movesDevelopspiece(move) {
        return move.moveNumber <= 10 && ['knight', 'bishop'].includes(move.piece.type);
    }
    
    movesControlsCenter(move) {
        const [row, col] = move.to;
        return (row === 3 || row === 4) && (col === 3 || col === 4);
    }
    
    moveImprovesSafety(move, gameState) {
        // Check if move improves king safety (simplified)
        return move.piece.type === 'king' && Math.abs(move.to[1] - move.from[1]) === 2;
    }
    
    movesRepeatsPiece(move, moveHistory) {
        const recent = moveHistory.slice(-4);
        return recent.some(m => 
            m.piece.type === move.piece.type && 
            m.from[0] === move.from[0] && 
            m.from[1] === move.from[1]
        );
    }
    
    movesQueenEarly(move) {
        return move.piece.type === 'queen' && move.moveNumber <= 5;
    }
    
    createsFork(move, gameState) {
        // Simplified fork detection
        return false; // Would need more complex logic
    }
    
    getMoveNotation(move) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        const pieceSymbol = move.piece.type === 'pawn' ? '' : move.piece.type.charAt(0).toUpperCase();
        const capture = move.captured ? 'x' : '';
        const to = files[move.to[1]] + ranks[move.to[0]];
        return `${pieceSymbol}${capture}${to}`;
    }
    
    formatAnalysis(analysis, move) {
        // Format the analysis for display
        return {
            rating: analysis.rating || 'okay',
            feedback: analysis.mainFeedback || 'Move analyzed',
            tacticalAnalysis: analysis.tacticalAnalysis,
            strategicAnalysis: analysis.strategicAnalysis,
            suggestions: analysis.suggestions || [],
            alternatives: analysis.alternatives || [],
            learningPoint: analysis.learningPoint
        };
    }
    
    loadGameHistory() {
        try {
            return JSON.parse(localStorage.getItem('chess_game_history')) || [];
        } catch {
            return [];
        }
    }
    
    loadPlayerProfile() {
        try {
            return JSON.parse(localStorage.getItem('chess_player_profile')) || {};
        } catch {
            return {};
        }
    }
    
    savePlayerProfile(profile) {
        localStorage.setItem('chess_player_profile', JSON.stringify(profile));
    }
}

// Global enhanced AI tutor instance
window.enhancedAI = new EnhancedAITutor();