class AITutor {
    constructor() {
        this.gameHistory = [];
        this.playerPatterns = {};
        this.currentGameAnalysis = [];
        this.initializeData();
        
        this.feedbackTypes = {
            tactical: 'Tactical',
            positional: 'Positional',
            opening: 'Opening',
            endgame: 'Endgame',
            pattern: 'Pattern Recognition'
        };
        
        this.commonMistakes = [
            'Moving the same piece multiple times in opening',
            'Not developing pieces towards the center',
            'Ignoring opponent threats',
            'Missing tactical opportunities',
            'Poor pawn structure',
            'King safety issues',
            'Weak squares in position'
        ];
        
        this.strategicPrinciples = [
            'Control the center with pawns and pieces',
            'Develop knights before bishops',
            'Castle early for king safety',
            'Connect your rooks',
            'Look for tactical motifs: pins, forks, skewers',
            'Improve your worst-placed piece',
            'Create and exploit weaknesses'
        ];
    }
    
    async initializeData() {
        try {
            this.gameHistory = await this.loadGameHistory();
            this.playerPatterns = await this.loadPlayerPatterns();
        } catch (error) {
            console.error('Error initializing AI tutor data:', error);
            this.gameHistory = [];
            this.playerPatterns = {};
        }
    }
    
    async analyzeMoveAndProvideFeedback(move) {
        try {
            if (!move) {
                throw new Error('No move provided for analysis');
            }
            
            // Validate move object if validator is available
            if (window.validator) {
                window.validator.validateMove(move);
            }
            
            // Try Stockfish analysis first, fallback to basic analysis
            let analysis;
            try {
                analysis = await this.analyzeWithStockfish(move);
            } catch (error) {
                console.log('Stockfish analysis failed, using basic analysis:', error);
                analysis = this.analyzeMove(move);
            }
            
            this.currentGameAnalysis.push(analysis);
            
            const feedback = this.generateFeedback(analysis, move);
            this.displayFeedback(feedback);
            
            // Update player patterns
            this.updatePlayerPatterns(move, analysis);
            
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'Move Analysis', { notify: false });
            } else {
                console.error('Move analysis error:', error);
            }
        }
    }
    
    async analyzeWithStockfish(move) {
        if (!window.stockfishEngine || !window.stockfishEngine.isReady || !window.ChessUtils) {
            throw new Error('Stockfish engine not available');
        }
        
        try {
            // Get the chess engine instance to access board state
            const chessEngine = window.chessApp?.chessEngine;
            if (!chessEngine) {
                throw new Error('Chess engine not available');
            }
            
            // Create board state before the move
            const boardBeforeMove = this.reconstructBoardBeforeMove(chessEngine.board, move);
            const playerBeforeMove = move.player === 'white' ? 'black' : 'white'; // Switch for before state
            
            // Convert to FEN
            const fenBefore = window.ChessUtils.boardToFen(boardBeforeMove, playerBeforeMove, move.moveNumber);
            const fenAfter = window.ChessUtils.boardToFen(chessEngine.board, chessEngine.currentPlayer, chessEngine.moveCount);
            
            // Get Stockfish evaluation
            const moveQuality = await window.stockfishEngine.getMoveQuality(fenBefore, fenAfter, {
                depth: 8,
                time: 1500
            });
            
            // Combine Stockfish analysis with basic analysis
            const basicAnalysis = this.analyzeMove(move);
            
            return {
                moveQuality: moveQuality.score,
                stockfishEvaluation: moveQuality,
                evalChange: moveQuality.evalChange,
                tacticalThemes: basicAnalysis.tacticalThemes,
                positionalFactors: basicAnalysis.positionalFactors,
                openingPrinciples: basicAnalysis.openingPrinciples,
                mistakes: this.identifyMistakesWithStockfish(move, moveQuality),
                suggestions: this.generateStockfishSuggestions(move, moveQuality),
                isStockfishAnalysis: true
            };
        } catch (error) {
            console.error('Stockfish analysis error:', error);
            throw error;
        }
    }
    
    reconstructBoardBeforeMove(currentBoard, move) {
        // Create a copy of the current board and reverse the move
        const board = window.ChessUtils.copyBoard(currentBoard);
        
        // Reverse the move
        board[move.from[0]][move.from[1]] = move.piece;
        board[move.to[0]][move.to[1]] = move.captured || null;
        
        return board;
    }
    
    identifyMistakesWithStockfish(move, stockfishQuality) {
        const mistakes = [];
        
        // Use Stockfish evaluation to identify mistakes
        if (stockfishQuality.evalChange < -0.5) {
            mistakes.push('significant_evaluation_loss');
        } else if (stockfishQuality.evalChange < -0.2) {
            mistakes.push('evaluation_loss');
        }
        
        // Add basic pattern mistakes
        if (move.moveNumber <= 10 && move.piece.type === 'queen') {
            mistakes.push('early_queen_development');
        }
        
        return mistakes;
    }
    
    generateStockfishSuggestions(move, stockfishQuality) {
        const suggestions = [];
        
        if (stockfishQuality.score >= 80) {
            suggestions.push('Excellent move! You found the best continuation.');
        } else if (stockfishQuality.score >= 60) {
            suggestions.push('Good move. You\'re maintaining a solid position.');
        } else if (stockfishQuality.score < 30) {
            if (stockfishQuality.evalChange < -0.5) {
                suggestions.push('This move loses significant advantage. Look for better alternatives.');
            } else {
                suggestions.push('Consider calculating a few moves deeper before deciding.');
            }
        }
        
        // Add evaluation-based suggestions
        if (Math.abs(stockfishQuality.evalChange) > 0.3) {
            const beforeEval = window.ChessUtils.formatEvaluation(stockfishQuality.beforeEval);
            const afterEval = window.ChessUtils.formatEvaluation(stockfishQuality.afterEval);
            suggestions.push(`Position evaluation changed from ${beforeEval.score} to ${afterEval.score}.`);
        }
        
        return suggestions;
    }
    
    analyzeMove(move) {
        const analysis = {
            moveQuality: this.evaluateMoveQuality(move),
            tacticalThemes: this.identifyTacticalThemes(move),
            positionalFactors: this.evaluatePositionalFactors(move),
            openingPrinciples: this.checkOpeningPrinciples(move),
            mistakes: this.identifyMistakes(move),
            suggestions: this.generateSuggestions(move)
        };
        
        return analysis;
    }
    
    evaluateMoveQuality(move) {
        // Simplified move evaluation
        let score = 50; // Base score
        
        // Reward captures
        if (move.captured) {
            const pieceValues = {
                pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0
            };
            score += pieceValues[move.captured.type] * 10;
        }
        
        // Reward center control
        const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
        const extendedCenter = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
        
        if (centerSquares.some(([r,c]) => r === move.to[0] && c === move.to[1])) {
            score += 15;
        } else if (extendedCenter.some(([r,c]) => r === move.to[0] && c === move.to[1])) {
            score += 8;
        }
        
        // Penalize moving same piece multiple times in opening
        if (move.moveNumber <= 10) {
            const sameFromSquareMoves = this.currentGameAnalysis.filter(analysis => 
                analysis.move && 
                analysis.move.from[0] === move.from[0] && 
                analysis.move.from[1] === move.from[1]
            );
            if (sameFromSquareMoves.length > 0) {
                score -= 10;
            }
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    identifyTacticalThemes(move) {
        const themes = [];
        
        // Check for discovered attacks, pins, forks etc.
        if (move.captured) {
            themes.push('capture');
        }
        
        // Simple tactical pattern detection
        if (move.piece.type === 'knight') {
            themes.push('knight_tactics');
        }
        
        if (move.piece.type === 'queen' && move.captured) {
            themes.push('queen_capture');
        }
        
        return themes;
    }
    
    evaluatePositionalFactors(move) {
        const factors = {
            centerControl: this.evaluateCenterControl(move),
            kingSafety: this.evaluateKingSafety(move),
            development: this.evaluateDevelopment(move),
            pawnStructure: this.evaluatePawnStructure(move)
        };
        
        return factors;
    }
    
    evaluateCenterControl(move) {
        const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
        return centerSquares.some(([r,c]) => r === move.to[0] && c === move.to[1]) ? 'good' : 'neutral';
    }
    
    evaluateKingSafety(move) {
        // Simplified king safety evaluation
        if (move.piece.type === 'king' && Math.abs(move.to[1] - move.from[1]) === 2) {
            return 'castling'; // Detected castling
        }
        return 'neutral';
    }
    
    evaluateDevelopment(move) {
        if (move.moveNumber <= 10) {
            if (['knight', 'bishop'].includes(move.piece.type)) {
                return 'developing';
            }
            if (move.piece.type === 'queen' && move.moveNumber <= 5) {
                return 'premature_queen';
            }
        }
        return 'neutral';
    }
    
    evaluatePawnStructure(move) {
        // Basic pawn structure evaluation
        return 'neutral';
    }
    
    checkOpeningPrinciples(move) {
        const principles = [];
        
        if (move.moveNumber <= 10) {
            // Check opening principles
            if (['knight', 'bishop'].includes(move.piece.type)) {
                principles.push('good_development');
            }
            
            if (move.piece.type === 'pawn' && [3, 4].includes(move.to[0])) {
                principles.push('center_control');
            }
            
            if (move.piece.type === 'queen' && move.moveNumber <= 4) {
                principles.push('early_queen_development');
            }
            
            if (move.piece.type === 'king' && Math.abs(move.to[1] - move.from[1]) === 2) {
                principles.push('castling');
            }
        }
        
        return principles;
    }
    
    identifyMistakes(move) {
        const mistakes = [];
        
        if (move.moveNumber <= 10 && move.piece.type === 'queen') {
            mistakes.push('early_queen_development');
        }
        
        // Check for repeated piece moves in opening
        if (move.moveNumber <= 8) {
            const samePieceMoves = this.currentGameAnalysis.filter(analysis => 
                analysis.move && 
                analysis.move.piece.type === move.piece.type &&
                analysis.move.from[0] === move.from[0] && 
                analysis.move.from[1] === move.from[1]
            );
            
            if (samePieceMoves.length > 0) {
                mistakes.push('repeated_piece_moves');
            }
        }
        
        return mistakes;
    }
    
    generateSuggestions(move) {
        const suggestions = [];
        
        if (move.moveNumber <= 10) {
            if (move.piece.type === 'pawn') {
                suggestions.push('Consider developing your knights and bishops before moving more pawns');
            }
            
            if (['knight', 'bishop'].includes(move.piece.type)) {
                suggestions.push('Good development! Try to control central squares');
            }
        }
        
        if (move.moveNumber > 10 && move.moveNumber <= 20) {
            suggestions.push('Look for tactical opportunities like pins, forks, and skewers');
            suggestions.push('Consider improving your piece coordination');
        }
        
        return suggestions;
    }
    
    generateFeedback(analysis, move) {
        let feedback = {
            type: analysis.isStockfishAnalysis ? 'stockfish' : 'general',
            rating: this.getRatingFromScore(analysis.moveQuality),
            mainMessage: this.getMainFeedbackMessage(analysis, move),
            suggestions: analysis.suggestions,
            principles: this.getRelevantPrinciples(analysis, move),
            stockfishData: analysis.stockfishEvaluation,
            evalChange: analysis.evalChange
        };
        
        return feedback;
    }
    
    getRatingFromScore(score) {
        if (score >= 80) return 'excellent';
        if (score >= 65) return 'good';
        if (score >= 50) return 'okay';
        if (score >= 35) return 'questionable';
        return 'poor';
    }
    
    getMainFeedbackMessage(analysis, move) {
        const rating = this.getRatingFromScore(analysis.moveQuality);
        
        let message = '';
        
        switch (rating) {
            case 'excellent':
                message = `Excellent move! `;
                break;
            case 'good':
                message = `Good move. `;
                break;
            case 'okay':
                message = `This move is playable. `;
                break;
            case 'questionable':
                message = `This move could be improved. `;
                break;
            case 'poor':
                message = `Consider a different move. `;
                break;
        }
        
        // Add specific feedback based on analysis
        if (analysis.mistakes.includes('early_queen_development')) {
            message += "Try to avoid bringing your queen out too early in the opening. ";
        }
        
        if (analysis.mistakes.includes('repeated_piece_moves')) {
            message += "Avoid moving the same piece multiple times in the opening. ";
        }
        
        if (analysis.openingPrinciples.includes('good_development')) {
            message += "Great development of your pieces! ";
        }
        
        if (analysis.openingPrinciples.includes('center_control')) {
            message += "Good pawn move for center control! ";
        }
        
        if (analysis.tacticalThemes.includes('capture')) {
            message += "Nice capture! ";
        }
        
        return message;
    }
    
    getRelevantPrinciples(analysis, move) {
        const principles = [];
        
        if (move.moveNumber <= 10) {
            principles.push('Develop pieces towards the center');
            principles.push('Control central squares');
            principles.push('Castle early for king safety');
        } else if (move.moveNumber <= 20) {
            principles.push('Look for tactical opportunities');
            principles.push('Improve piece coordination');
            principles.push('Create threats against opponent weaknesses');
        } else {
            principles.push('Activate your least active piece');
            principles.push('Consider pawn breaks to open the position');
            principles.push('Look for endgame patterns');
        }
        
        return principles.slice(0, 2); // Return top 2 most relevant
    }
    
    displayFeedback(feedback) {
        const feedbackElement = document.getElementById('tutor-feedback');
        if (!feedbackElement) return;
        
        try {
            const ratingColors = {
                excellent: '#48bb78',
                good: '#68d391',
                okay: '#fbd38d',
                questionable: '#f6ad55',
                poor: '#fc8181'
            };
            
            // Build feedback HTML safely
            let feedbackHtml = `<div class="feedback-item">`;
            
            // Rating section
            feedbackHtml += `
                <div class="move-rating" style="color: ${ratingColors[feedback.rating]}; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    <span>Rating: ${feedback.rating.toUpperCase()}</span>
                    ${feedback.type === 'stockfish' ? '<span style="font-size: 0.75em; background: #4a5568; color: white; padding: 2px 6px; border-radius: 4px;">STOCKFISH</span>' : ''}
                </div>
            `;
            
            // Stockfish analysis section
            if (feedback.stockfishData) {
                const evalChange = feedback.evalChange ? 
                    (feedback.evalChange > 0 ? '+' : '') + feedback.evalChange.toFixed(2) : 'N/A';
                const beforeEval = window.ChessUtils?.formatEvaluation(feedback.stockfishData.beforeEval)?.score || 'N/A';
                const afterEval = window.ChessUtils?.formatEvaluation(feedback.stockfishData.afterEval)?.score || 'N/A';
                
                feedbackHtml += `
                    <div class="stockfish-analysis" style="margin: 8px 0; padding: 8px; background: #f7fafc; border-radius: 6px; font-size: 0.875em;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span><strong>Move Quality:</strong> ${feedback.stockfishData.score}/100</span>
                            <span><strong>Eval Change:</strong> ${evalChange}</span>
                        </div>
                        <div style="font-size: 0.8em; color: #718096;">
                            <strong>Before:</strong> ${beforeEval} → <strong>After:</strong> ${afterEval}
                        </div>
                    </div>
                `;
            }
            
            // Main feedback message (escaped)
            const mainMessage = feedback.mainMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            feedbackHtml += `<p class="main-feedback">${mainMessage}</p>`;
            
            // Suggestions section
            if (feedback.suggestions && feedback.suggestions.length > 0) {
                feedbackHtml += `<div class="suggestions"><strong>Suggestions:</strong><ul>`;
                feedback.suggestions.forEach(suggestion => {
                    const escapedSuggestion = suggestion.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    feedbackHtml += `<li>${escapedSuggestion}</li>`;
                });
                feedbackHtml += `</ul></div>`;
            }
            
            // Principles section
            if (feedback.principles && feedback.principles.length > 0) {
                feedbackHtml += `<div class="principles"><strong>Remember:</strong><ul>`;
                feedback.principles.forEach(principle => {
                    const escapedPrinciple = principle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    feedbackHtml += `<li>${escapedPrinciple}</li>`;
                });
                feedbackHtml += `</ul></div>`;
            }
            
            feedbackHtml += `</div>`;
            feedbackElement.innerHTML = feedbackHtml;
            
        } catch (error) {
            console.error('Error displaying feedback:', error);
            feedbackElement.innerHTML = '<p>Error displaying feedback. Please try again.</p>';
        }
    }
    
    updatePlayerPatterns(move, analysis) {
        const patterns = this.playerPatterns;
        
        // Track opening preferences
        if (move.moveNumber <= 10) {
            if (!patterns.openingMoves) patterns.openingMoves = {};
            const moveNotation = this.getMoveNotation(move);
            patterns.openingMoves[moveNotation] = (patterns.openingMoves[moveNotation] || 0) + 1;
        }
        
        // Track tactical awareness
        if (analysis.tacticalThemes.length > 0) {
            patterns.tacticalAwareness = (patterns.tacticalAwareness || 0) + 1;
        }
        
        // Track common mistakes
        analysis.mistakes.forEach(mistake => {
            if (!patterns.commonMistakes) patterns.commonMistakes = {};
            patterns.commonMistakes[mistake] = (patterns.commonMistakes[mistake] || 0) + 1;
        });
        
        this.savePlayerPatterns(patterns);
    }
    
    analyzePlayerPatterns() {
        const patterns = this.playerPatterns;
        const insights = [];
        
        // Analyze opening patterns
        if (patterns.openingMoves) {
            const mostCommonOpening = Object.entries(patterns.openingMoves)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (mostCommonOpening) {
                insights.push({
                    type: 'strength',
                    category: 'Opening',
                    message: `You frequently play ${mostCommonOpening[0]} in the opening`
                });
            }
        }
        
        // Analyze tactical awareness
        if (patterns.tacticalAwareness && patterns.tacticalAwareness > 5) {
            insights.push({
                type: 'strength',
                category: 'Tactics',
                message: 'You show good tactical awareness in your games'
            });
        } else {
            insights.push({
                type: 'weakness',
                category: 'Tactics',
                message: 'Focus on tactical pattern recognition and calculation'
            });
        }
        
        // Analyze common mistakes
        if (patterns.commonMistakes) {
            const mostCommonMistake = Object.entries(patterns.commonMistakes)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (mostCommonMistake && mostCommonMistake[1] > 3) {
                insights.push({
                    type: 'weakness',
                    category: 'Pattern',
                    message: this.getMistakeAdvice(mostCommonMistake[0])
                });
            }
        }
        
        this.displayPatternInsights(insights);
        return insights;
    }
    
    getMistakeAdvice(mistake) {
        const advice = {
            'early_queen_development': 'Try to develop knights and bishops before bringing out your queen',
            'repeated_piece_moves': 'Avoid moving the same piece multiple times in the opening',
            'ignoring_center': 'Focus more on controlling central squares',
            'poor_king_safety': 'Remember to castle early and keep your king safe'
        };
        
        return advice[mistake] || 'Work on recognizing and avoiding this pattern';
    }
    
    displayPatternInsights(insights) {
        const patternsElement = document.getElementById('pattern-insights');
        
        if (insights.length === 0) {
            patternsElement.innerHTML = '<p>Play more games to unlock pattern analysis!</p>';
            return;
        }
        
        const insightsHtml = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-${insight.type}">
                    ${insight.category}: ${insight.message}
                </div>
            </div>
        `).join('');
        
        patternsElement.innerHTML = insightsHtml;
    }
    
    getMoveNotation(move) {
        const pieceSymbol = move.piece.type === 'pawn' ? '' : 
            move.piece.type.charAt(0).toUpperCase();
        const toSquare = String.fromCharCode(97 + move.to[1]) + (8 - move.to[0]);
        return `${pieceSymbol}${toSquare}`;
    }
    
    async loadGameHistory() {
        try {
            if (window.userDataService) {
                return await window.userDataService.loadGameHistory();
            }
            
            if (window.storageHelper) {
                return window.storageHelper.get('chessAITutorHistory', []);
            }
            
            // Fallback to direct localStorage
            const stored = localStorage.getItem('chessAITutorHistory');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading game history:', error);
            return [];
        }
    }
    
    async saveGameHistory(history) {
        try {
            if (window.userDataService) {
                await window.userDataService.saveGameHistory(history);
            } else if (window.storageHelper) {
                window.storageHelper.set('chessAITutorHistory', history);
            } else {
                // Fallback to direct localStorage
                localStorage.setItem('chessAITutorHistory', JSON.stringify(history));
            }
        } catch (error) {
            console.error('Error saving game history:', error);
        }
    }
    
    async loadPlayerPatterns() {
        try {
            if (window.userDataService) {
                return await window.userDataService.loadPlayerPatterns();
            }
            
            if (window.storageHelper) {
                return window.storageHelper.get('chessAITutorPatterns', {});
            }
            
            // Fallback to direct localStorage
            const stored = localStorage.getItem('chessAITutorPatterns');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading player patterns:', error);
            return {};
        }
    }
    
    async savePlayerPatterns(patterns) {
        try {
            if (window.userDataService) {
                await window.userDataService.savePlayerPatterns(patterns);
            } else if (window.storageHelper) {
                window.storageHelper.set('chessAITutorPatterns', patterns);
            } else {
                // Fallback to direct localStorage
                localStorage.setItem('chessAITutorPatterns', JSON.stringify(patterns));
            }
            this.playerPatterns = patterns;
        } catch (error) {
            console.error('Error saving player patterns:', error);
        }
    }
    
    analyzeGame(gameHistory) {
        const analysis = {
            totalMoves: gameHistory.length,
            averageMoveQuality: 0,
            tacticalOpportunities: 0,
            mistakeCount: 0,
            strongMoves: 0,
            suggestions: []
        };
        
        gameHistory.forEach(move => {
            const moveAnalysis = this.analyzeMove(move);
            analysis.averageMoveQuality += moveAnalysis.moveQuality;
            
            if (moveAnalysis.tacticalThemes.length > 0) {
                analysis.tacticalOpportunities++;
            }
            
            if (moveAnalysis.mistakes.length > 0) {
                analysis.mistakeCount++;
            }
            
            if (moveAnalysis.moveQuality >= 80) {
                analysis.strongMoves++;
            }
        });
        
        if (gameHistory.length > 0) {
            analysis.averageMoveQuality /= gameHistory.length;
        }
        
        // Generate game-level suggestions
        if (analysis.mistakeCount > analysis.totalMoves * 0.3) {
            analysis.suggestions.push('Focus on reducing blunders by double-checking moves');
        }
        
        if (analysis.tacticalOpportunities < analysis.totalMoves * 0.2) {
            analysis.suggestions.push('Work on tactical pattern recognition');
        }
        
        return analysis;
    }
    
    startNewGame() {
        this.currentGameAnalysis = [];
        document.getElementById('tutor-feedback').innerHTML = 
            '<p>New game started! Make your first move to begin receiving guidance.</p>';
    }
}