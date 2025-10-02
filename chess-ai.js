class ChessAI {
    constructor(difficulty = 3) {
        this.difficulty = difficulty; // 1-5 scale
        // Reduced depth for much faster performance
        this.maxDepth = difficulty <= 2 ? 1 : 2; // Max depth 2 for responsive play
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
            console.log('AI: Using opening book move');
            return bookMove;
        }

        let moves;
        try {
            moves = this.getAllValidMoves(chessEngine, this.color);
            console.log(`AI: Found ${moves.length} possible moves`);
            if (moves.length === 0) {
                return null;
            }
        } catch (error) {
            console.error('Error in AI move generation:', error);
            return null;
        }

        // Sort moves to prioritize captures and checks
        moves.sort((a, b) => this.getMoveScore(chessEngine, b) - this.getMoveScore(chessEngine, a));

        // Only evaluate top N moves for speed (more for higher difficulty)
        const maxMovesToEvaluate = this.difficulty <= 2 ? 10 : 15;
        const movesToEvaluate = moves.slice(0, maxMovesToEvaluate);

        // Log top 5 moves by initial score
        console.log(`AI: Evaluating ${movesToEvaluate.length} of ${moves.length} moves (difficulty ${this.difficulty}, depth ${this.maxDepth})`);
        console.log('AI: Top 5 moves by initial score:');
        for (let i = 0; i < Math.min(5, movesToEvaluate.length); i++) {
            const move = movesToEvaluate[i];
            const score = this.getMoveScore(chessEngine, move);
            const captured = chessEngine.board[move.toRow][move.toCol];
            const moveStr = `${this.coordsToAlgebraic(move.fromRow, move.fromCol)}->${this.coordsToAlgebraic(move.toRow, move.toCol)}`;
            console.log(`  ${moveStr}: score ${score}${captured ? ' (CAPTURE ' + captured.type + ')' : ''}`);
        }

        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of movesToEvaluate) {
            const score = this.minimax(chessEngine, move, this.maxDepth - 1, -Infinity, Infinity, false);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        const bestMoveStr = bestMove ? `${this.coordsToAlgebraic(bestMove.fromRow, bestMove.fromCol)}->${this.coordsToAlgebraic(bestMove.toRow, bestMove.toCol)}` : 'none';
        console.log(`AI: Best move selected: ${bestMoveStr} with score ${bestScore}`);

        return bestMove;
    }
    
    // Get move priority score for sorting
    getMoveScore(chessEngine, move) {
        let score = 0;
        
        // Prioritize captures
        const capturedPiece = chessEngine.board[move.toRow][move.toCol];
        if (capturedPiece) {
            score += this.pieceValues[capturedPiece.type];
            
            // Even higher priority for capturing high-value pieces
            if (capturedPiece.type === 'queen') {
                score += 500; // Extra bonus for queen captures
            } else if (capturedPiece.type === 'rook') {
                score += 200; // Extra bonus for rook captures
            }
        }
        
        // Prioritize center moves
        const centerDistance = Math.abs(3.5 - move.toRow) + Math.abs(3.5 - move.toCol);
        score += (7 - centerDistance) * 5;
        
        // Prioritize piece development (getting pieces off back rank)
        if (move.piece.color === this.color) {
            if ((this.color === 'white' && move.fromRow === 7) || 
                (this.color === 'black' && move.fromRow === 0)) {
                if (move.piece.type === 'knight' || move.piece.type === 'bishop') {
                    score += 30; // Development bonus
                }
            }
        }
        
        return score;
    }
    
    // Minimax algorithm with alpha-beta pruning
    minimax(chessEngine, move, depth, alpha, beta, isMaximizing) {
        let score;
        let moveResult = null;

        // Make the move temporarily
        if (chessEngine.chess) {
            // Save FEN for undo
            const savedFen = chessEngine.chess.fen();

            // Make move using chess.js
            const from = this.coordsToAlgebraic(move.fromRow, move.fromCol);
            const to = this.coordsToAlgebraic(move.toRow, move.toCol);

            moveResult = chessEngine.chess.move({ from, to, promotion: 'q' });

            if (!moveResult) {
                // Invalid move, return worst score
                return isMaximizing ? -100000 : 100000;
            }

            // Update board representation
            chessEngine.board = chessEngine.initializeBoard();

            if (depth === 0) {
                score = this.evaluatePosition(chessEngine);
            } else {
                const currentColor = isMaximizing ? this.color : (this.color === 'white' ? 'black' : 'white');
                const moves = this.getAllValidMoves(chessEngine, currentColor);

                if (moves.length === 0) {
                    // Checkmate or stalemate
                    if (chessEngine.chess.in_checkmate()) {
                        score = isMaximizing ? -10000 : 10000;
                    } else {
                        score = 0; // Stalemate
                    }
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

            // Restore the position
            chessEngine.chess.load(savedFen);
            chessEngine.board = chessEngine.initializeBoard();
        } else {
            // Original implementation for old chess-engine.js
            const originalBoard = this.copyBoard(chessEngine.board);
            const capturedPiece = chessEngine.board[move.toRow][move.toCol];

            chessEngine.board[move.toRow][move.toCol] = chessEngine.board[move.fromRow][move.fromCol];
            chessEngine.board[move.fromRow][move.fromCol] = null;

            if (depth === 0) {
                score = this.evaluatePosition(chessEngine);
            } else {
                const currentColor = isMaximizing ? this.color : (this.color === 'white' ? 'black' : 'white');
                const moves = this.getAllValidMoves(chessEngine, currentColor);

                if (moves.length === 0) {
                    score = isMaximizing ? -10000 : 10000;
                } else if (isMaximizing) {
                    score = -Infinity;
                    for (const nextMove of moves) {
                        score = Math.max(score, this.minimax(chessEngine, nextMove, depth - 1, alpha, beta, false));
                        alpha = Math.max(alpha, score);
                        if (beta <= alpha) break;
                    }
                } else {
                    score = Infinity;
                    for (const nextMove of moves) {
                        score = Math.min(score, this.minimax(chessEngine, nextMove, depth - 1, alpha, beta, true));
                        beta = Math.min(beta, score);
                        if (beta <= alpha) break;
                    }
                }
            }

            chessEngine.board = originalBoard;
        }

        return score;
    }

    // Convert coordinates to algebraic notation
    coordsToAlgebraic(row, col) {
        const file = String.fromCharCode(97 + col);
        const rank = 8 - row;
        return file + rank;
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
        
        // Add tactical bonuses
        score += this.evaluateTactics(chessEngine);
        
        return score;
    }
    
    // Evaluate tactical elements
    evaluateTactics(chessEngine) {
        let score = 0;
        
        // Check for captures available
        const myMoves = this.getAllValidMoves(chessEngine, this.color);
        const opponentColor = this.color === 'white' ? 'black' : 'white';
        const opponentMoves = this.getAllValidMoves(chessEngine, opponentColor);
        
        // Bonus for capturing valuable pieces
        for (const move of myMoves) {
            const capturedPiece = chessEngine.board[move.toRow][move.toCol];
            if (capturedPiece) {
                score += this.pieceValues[capturedPiece.type] * 0.1; // 10% bonus for captures
            }
        }
        
        // Penalty for hanging pieces (pieces under attack)
        for (const opponentMove of opponentMoves) {
            const targetPiece = chessEngine.board[opponentMove.toRow][opponentMove.toCol];
            if (targetPiece && targetPiece.color === this.color) {
                score -= this.pieceValues[targetPiece.type] * 0.15; // Penalty for hanging pieces
            }
        }
        
        // Center control bonus
        const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
        for (const [row, col] of centerSquares) {
            const piece = chessEngine.board[row][col];
            if (piece && piece.color === this.color) {
                score += 20; // Bonus for controlling center
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

        // Check if using chess.js wrapper
        if (chessEngine.chess) {
            // Using chess-engine-fixed.js with chess.js
            const chessMoves = chessEngine.chess.moves({ verbose: true });

            for (const move of chessMoves) {
                const fromPos = this.algebraicToCoords(move.from);
                const toPos = this.algebraicToCoords(move.to);
                const piece = chessEngine.board[fromPos.row][fromPos.col];

                if (piece && piece.color === color) {
                    moves.push({
                        fromRow: fromPos.row,
                        fromCol: fromPos.col,
                        toRow: toPos.row,
                        toCol: toPos.col,
                        piece: piece
                    });
                }
            }
        } else {
            // Using original chess-engine.js
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = chessEngine.board[row][col];
                    if (piece && piece.color === color) {
                        const pieceMoves = chessEngine.getPossibleMovesForPiece(row, col, piece);

                        for (const [toRow, toCol] of pieceMoves) {
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

    // Convert algebraic notation (e2) to coordinates
    algebraicToCoords(square) {
        const col = square.charCodeAt(0) - 97; // a=0, b=1, etc
        const row = 8 - parseInt(square[1]); // 8=0, 7=1, etc
        return { row, col };
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
                    // Use the chess engine's existing makeMove method to ensure all state is updated properly
                    chessEngine.makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
                }
                
                // Hide thinking indicator
                this.showThinkingIndicator(false);
                resolve(bestMove);
            }, 200); // Short delay to show thinking indicator
        });
    }
    
    // Generate move notation for history
    getMoveNotation(move, piece, captured) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const toSquare = files[move.toCol] + (8 - move.toRow);
        
        const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
        const captureSymbol = captured ? 'x' : '';
        
        // For pawns, include file letter if capturing
        if (piece.type === 'pawn' && captured) {
            const fromFile = files[move.fromCol];
            return `${fromFile}${captureSymbol}${toSquare}`;
        }
        
        return `${pieceSymbol}${captureSymbol}${toSquare}`;
    }
    
    // Get opening book move if available
    getOpeningBookMove(chessEngine) {
        if (chessEngine.moveHistory.length > 10) return null; // Only use in opening
        
        // Create position key from move history - filter out undefined notations
        const moveSequence = chessEngine.moveHistory
            .map(move => move.notation)
            .filter(notation => notation && notation !== 'undefined')
            .join(',');
        
        // Look for moves in opening book
        const bookMoves = this.openingBook[moveSequence];
        if (!bookMoves || bookMoves.length === 0) {
            // Also try with partial sequences for flexibility
            const partialSequence = moveSequence.split(',').slice(-2).join(',');
            const partialMoves = this.openingBook[partialSequence];
            if (!partialMoves || partialMoves.length === 0) return null;
            
            // Use partial sequence moves
            const randomMove = partialMoves[Math.floor(Math.random() * partialMoves.length)];
            const move = this.parseMove(randomMove, chessEngine);
            if (move && this.isValidMoveForColor(chessEngine, move, this.color)) {
                return move;
            }
            return null;
        }
        
        // Pick a random move from the book
        const randomMove = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        
        // Convert notation to move object
        const move = this.parseMove(randomMove, chessEngine);
        if (move && this.isValidMoveForColor(chessEngine, move, this.color)) {
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
    
    // Check if move is valid for a specific color
    isValidMoveForColor(chessEngine, move, color) {
        const piece = chessEngine.board[move.fromRow][move.fromCol];
        return piece && piece.color === color && 
               chessEngine.getPossibleMovesForPiece(move.fromRow, move.fromCol, piece)
                   .some(([r, c]) => r === move.toRow && c === move.toCol);
    }
    
    // Set difficulty level (1-5)
    setDifficulty(level) {
        this.difficulty = Math.max(1, Math.min(5, level));
        // Optimized depth for performance
        this.maxDepth = this.difficulty <= 2 ? 1 : 2;
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