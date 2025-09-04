class AITutor {
    constructor() {
        this.gameHistory = this.loadGameHistory();
        this.playerPatterns = this.loadPlayerPatterns();
        this.currentGameAnalysis = [];
        
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
    
    analyzeMoveAndProvideFeedback(move) {
        if (!move) return;
        
        const analysis = this.analyzeMove(move);
        this.currentGameAnalysis.push(analysis);
        
        const feedback = this.generateFeedback(analysis, move);
        this.displayFeedback(feedback);
        
        // Update player patterns
        this.updatePlayerPatterns(move, analysis);
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
            type: 'general',
            rating: this.getRatingFromScore(analysis.moveQuality),
            mainMessage: this.getMainFeedbackMessage(analysis, move),
            suggestions: analysis.suggestions,
            principles: this.getRelevantPrinciples(analysis, move)
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
        
        const ratingColors = {
            excellent: '#48bb78',
            good: '#68d391',
            okay: '#fbd38d',
            questionable: '#f6ad55',
            poor: '#fc8181'
        };
        
        const feedbackHtml = `
            <div class="feedback-item">
                <div class="move-rating" style="color: ${ratingColors[feedback.rating]}; font-weight: bold;">
                    Rating: ${feedback.rating.toUpperCase()}
                </div>
                <p class="main-feedback">${feedback.mainMessage}</p>
                ${feedback.suggestions.length > 0 ? `
                    <div class="suggestions">
                        <strong>Suggestions:</strong>
                        <ul>
                            ${feedback.suggestions.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${feedback.principles.length > 0 ? `
                    <div class="principles">
                        <strong>Remember:</strong>
                        <ul>
                            ${feedback.principles.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        feedbackElement.innerHTML = feedbackHtml;
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
    
    loadGameHistory() {
        try {
            return JSON.parse(localStorage.getItem('chessAITutorHistory')) || [];
        } catch {
            return [];
        }
    }
    
    saveGameHistory(history) {
        localStorage.setItem('chessAITutorHistory', JSON.stringify(history));
    }
    
    loadPlayerPatterns() {
        try {
            return JSON.parse(localStorage.getItem('chessAITutorPatterns')) || {};
        } catch {
            return {};
        }
    }
    
    savePlayerPatterns(patterns) {
        localStorage.setItem('chessAITutorPatterns', JSON.stringify(patterns));
        this.playerPatterns = patterns;
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