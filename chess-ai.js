class ChessAI {
    constructor(difficulty = 3) {
        this.difficulty = difficulty; // 1-5 scale
        this.maxDepth = Math.min(difficulty + 1, 4); // Limit depth for performance
        this.color = 'black'; // AI plays as black by default
        
        // Opening book - common strong opening moves
        this.openingBook = {
            // Starting position responses
            '': ['e7-e5', 'e7-e6', 'd7-d5', 'c7-c5'], // Black responses to any white first move
            'e2-e4': ['e7-e5', 'c7-c5', 'e7-e6', 'd7-d6'],
            'd2-d4': ['d7-d5', 'g8-f6', 'e7-e6', 'c7-c5'],
            'g1-f3': ['d7-d5', 'g8-f6', 'e7-e6'],
            'c2-c4': ['e7-e5', 'c7-c5', 'g8-f6'],
            
            // Common opening sequences
            'e2-e4,e7-e5': ['g1-f3', 'f1-c4', 'd2-d3'],
            'e2-e4,c7-c5': ['g1-f3', 'd2-d3', 'f1-e2'],
            'd2-d4,d7-d5': ['c2-c4', 'g1-f3', 'c1-f4'],
            'd2-d4,g8-f6': ['c2-c4', 'g1-f3', 'c1-g5'],
            
            // Black responses to common white openings
            'e2-e4,e7-e5,g1-f3': ['b8-c6', 'g8-f6', 'f7-f5'],
            'e2-e4,e7-e5,f1-c4': ['g8-f6', 'f7-f5', 'b8-c6'],
            'd2-d4,d7-d5,c2-c4': ['e7-e6', 'c7-c6', 'g8-f6'],
            'd2-d4,g8-f6,c2-c4': ['e7-e6', 'g7-g6', 'c7-c5']
        };
        
        // Piece values for evaluation
        this.pieceValues = {
            pawn: 100,
            knight: 320,
            bishop: 330,
            rook: 500,
            queen: 900,
            king: 20000
        };
        
        // Position evaluation tables for pieces
        this.pieceSquareTables = {
            pawn: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [5,  5, 10, 25, 25, 10,  5,  5],
                [0,  0,  0, 20, 20,  0,  0,  0],
                [5, -5,-10,  0,  0,-10, -5,  5],
                [5, 10, 10,-20,-20, 10, 10,  5],
                [0,  0,  0,  0,  0,  0,  0,  0]
            ],
            knight: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            bishop: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            rook: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [0,  0,  0,  5,  5,  0,  0,  0]
            ],
            queen: [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [-5,  0,  5,  5,  5,  5,  0, -5],
                [0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            king: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [20, 20,  0,  0,  0,  0, 20, 20],
                [20, 30, 10,  0,  0, 10, 30, 20]
            ]
        };
    }
    
    // Get the best move for the AI
    getBestMove(chessEngine) {
        // Check for opening book moves first
        const bookMove = this.getOpeningBookMove(chessEngine);
        if (bookMove) {
            return bookMove;
        }
        
        let moves;
        try {
            moves = this.getAllValidMoves(chessEngine, this.color);
            if (moves.length === 0) {
                return null;
            }
        } catch (error) {
            console.error('Error in AI move generation:', error);
            return null;
        }
        
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of moves) {
            const score = this.minimax(chessEngine, move, this.maxDepth - 1, -Infinity, Infinity, false);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    // Minimax algorithm with alpha-beta pruning
    minimax(chessEngine, move, depth, alpha, beta, isMaximizing) {
        // Make the move temporarily
        const originalBoard = this.copyBoard(chessEngine.board);
        const capturedPiece = chessEngine.board[move.toRow][move.toCol];
        
        chessEngine.board[move.toRow][move.toCol] = chessEngine.board[move.fromRow][move.fromCol];
        chessEngine.board[move.fromRow][move.fromCol] = null;
        
        let score;
        
        if (depth === 0) {
            score = this.evaluatePosition(chessEngine);
        } else {
            const currentColor = isMaximizing ? this.color : (this.color === 'white' ? 'black' : 'white');
            const moves = this.getAllValidMoves(chessEngine, currentColor);
            
            if (moves.length === 0) {
                // Checkmate or stalemate
                score = isMaximizing ? -10000 : 10000;
            } else if (isMaximizing) {
                score = -Infinity;
                for (const nextMove of moves) {
                    score = Math.max(score, this.minimax(chessEngine, nextMove, depth - 1, alpha, beta, false));
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break; // Alpha-beta pruning
                }
            } else {
                score = Infinity;
                for (const nextMove of moves) {
                    score = Math.min(score, this.minimax(chessEngine, nextMove, depth - 1, alpha, beta, true));
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break; // Alpha-beta pruning
                }
            }
        }
        
        // Restore the board
        chessEngine.board = originalBoard;
        
        return score;
    }
    
    // Evaluate the current position
    evaluatePosition(chessEngine) {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chessEngine.board[row][col];
                if (!piece) continue;
                
                let pieceValue = this.pieceValues[piece.type];
                
                // Add positional bonus
                const positionBonus = this.getPositionalValue(piece, row, col);
                pieceValue += positionBonus;
                
                if (piece.color === this.color) {
                    score += pieceValue;
                } else {
                    score -= pieceValue;
                }
            }
        }
        
        return score;
    }
    
    // Get positional value for a piece at a given position
    getPositionalValue(piece, row, col) {
        const table = this.pieceSquareTables[piece.type];
        if (!table) return 0;
        
        // Flip the table for black pieces
        const adjustedRow = piece.color === 'black' ? row : 7 - row;
        return table[adjustedRow][col];
    }
    
    // Get all valid moves for a given color
    getAllValidMoves(chessEngine, color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chessEngine.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = chessEngine.getPossibleMoves(row, col);
                    
                    for (const [toRow, toCol] of pieceMoves) {
                        if (chessEngine.isValidMove(row, col, toRow, toCol)) {
                            moves.push({
                                fromRow: row,
                                fromCol: col,
                                toRow: toRow,
                                toCol: toCol,
                                piece: piece
                            });
                        }
                    }
                }
            }
        }
        
        return moves;
    }
    
    // Create a deep copy of the board
    copyBoard(board) {
        return board.map(row => row.map(piece => piece ? { ...piece } : null));
    }
    
    // Make the AI move
    async makeMove(chessEngine) {
        // Show thinking indicator
        this.showThinkingIndicator(true);
        
        return new Promise((resolve) => {
            // Add a small delay to make it feel more natural
            setTimeout(() => {
                const bestMove = this.getBestMove(chessEngine);
                
                if (bestMove) {
                    // Use the chess engine's existing move logic
                    const piece = chessEngine.board[bestMove.fromRow][bestMove.fromCol];
                    
                    // Capture the piece if there is one
                    const capturedPiece = chessEngine.board[bestMove.toRow][bestMove.toCol];
                    if (capturedPiece) {
                        chessEngine.capturedPieces[capturedPiece.color].push(capturedPiece);
                    }
                    
                    // Make the move
                    chessEngine.board[bestMove.toRow][bestMove.toCol] = piece;
                    chessEngine.board[bestMove.fromRow][bestMove.fromCol] = null;
                    
                    // Add to move history
                    const moveNotation = this.getMoveNotation(bestMove, piece, capturedPiece);
                    chessEngine.moveHistory.push({
                        from: [bestMove.fromRow, bestMove.fromCol],
                        to: [bestMove.toRow, bestMove.toCol],
                        piece: piece,
                        captured: capturedPiece,
                        notation: moveNotation,
                        moveNumber: chessEngine.moveCount
                    });
                    
                    // Update game state
                    if (chessEngine.currentPlayer === 'white') {
                        chessEngine.moveCount++;
                    }
                    chessEngine.currentPlayer = chessEngine.currentPlayer === 'white' ? 'black' : 'white';
                    
                    // Update display
                    chessEngine.renderBoard();
                    chessEngine.updateGameInfo();
                    
                    // Trigger AI feedback for AI's own move
                    const lastMove = chessEngine.moveHistory[chessEngine.moveHistory.length - 1];
                    if (window.aiTutor) {
                        window.aiTutor.analyzeMoveAndProvideFeedback(lastMove);
                    }
                }
                
                // Hide thinking indicator
                this.showThinkingIndicator(false);
                resolve(bestMove);
            }, 500 + Math.random() * 1000); // Random delay between 0.5-1.5 seconds
        });
    }
    
    // Generate move notation for history
    getMoveNotation(move, piece, captured) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fromSquare = files[move.fromCol] + (8 - move.fromRow);
        const toSquare = files[move.toCol] + (8 - move.toRow);
        
        const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
        const captureSymbol = captured ? 'x' : '';
        
        return `${pieceSymbol}${fromSquare}${captureSymbol}${toSquare}`;
    }
    
    // Get opening book move if available
    getOpeningBookMove(chessEngine) {
        if (chessEngine.moveHistory.length > 10) return null; // Only use in opening
        
        // Create position key from move history
        const moveSequence = chessEngine.moveHistory
            .map(move => move.notation)
            .join(',');
        
        // Look for moves in opening book
        const bookMoves = this.openingBook[moveSequence];
        if (!bookMoves || bookMoves.length === 0) return null;
        
        // Pick a random move from the book
        const randomMove = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        
        // Convert notation to move object
        const move = this.parseMove(randomMove, chessEngine);
        if (move && chessEngine.isValidMove(move.fromRow, move.fromCol, move.toRow, move.toCol)) {
            return move;
        }
        
        return null;
    }
    
    // Parse algebraic notation to move object
    parseMove(notation, chessEngine) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        // Simple format: e2-e4
        if (notation.includes('-')) {
            const [from, to] = notation.split('-');
            const fromCol = files.indexOf(from[0]);
            const fromRow = 8 - parseInt(from[1]);
            const toCol = files.indexOf(to[0]);
            const toRow = 8 - parseInt(to[1]);
            
            const piece = chessEngine.board[fromRow][fromCol];
            if (piece && piece.color === this.color) {
                return {
                    fromRow,
                    fromCol,
                    toRow,
                    toCol,
                    piece
                };
            }
        }
        
        return null;
    }
    
    // Set difficulty level (1-5)
    setDifficulty(level) {
        this.difficulty = Math.max(1, Math.min(5, level));
        this.maxDepth = Math.min(this.difficulty + 1, 4);
    }
    
    // Set AI color
    setColor(color) {
        this.color = color;
    }
    
    // Show/hide thinking indicator
    showThinkingIndicator(show) {
        const indicator = document.getElementById('ai-thinking');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        } else if (show) {
            // Create thinking indicator if it doesn't exist
            const gameInfo = document.querySelector('.game-info');
            if (gameInfo) {
                const thinkingDiv = document.createElement('div');
                thinkingDiv.id = 'ai-thinking';
                thinkingDiv.className = 'ai-thinking';
                thinkingDiv.innerHTML = '🤖 AI is thinking...';
                gameInfo.appendChild(thinkingDiv);
            }
        }
    }
}