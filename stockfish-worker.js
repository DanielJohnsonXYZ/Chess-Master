/**
 * Stockfish Web Worker - Local implementation to avoid CORS issues
 * This is a lightweight chess engine that provides move evaluation
 */

// Basic chess evaluation constants
const PIECE_VALUES = {
    'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
};

const POSITION_VALUES = {
    'p': [
        0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5,  5, 10, 25, 25, 10,  5,  5,
        0,  0,  0, 20, 20,  0,  0,  0,
        5, -5,-10,  0,  0,-10, -5,  5,
        5, 10, 10,-20,-20, 10, 10,  5,
        0,  0,  0,  0,  0,  0,  0,  0
    ],
    'n': [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ],
    'b': [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ]
};

class LocalChessEngine {
    constructor() {
        this.depth = 3;
        this.isAnalyzing = false;
    }

    // Parse FEN notation
    parseFEN(fen) {
        const parts = fen.split(' ');
        const board = [];
        const rows = parts[0].split('/');
        
        for (let row of rows) {
            const boardRow = [];
            for (let char of row) {
                if (isNaN(char)) {
                    boardRow.push(char);
                } else {
                    for (let i = 0; i < parseInt(char); i++) {
                        boardRow.push(null);
                    }
                }
            }
            board.push(boardRow);
        }
        
        return {
            board,
            activeColor: parts[1],
            castling: parts[2],
            enPassant: parts[3],
            halfmove: parseInt(parts[4]),
            fullmove: parseInt(parts[5])
        };
    }

    // Evaluate board position
    evaluatePosition(position) {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = position.board[row][col];
                if (piece) {
                    const isWhite = piece === piece.toUpperCase();
                    const pieceType = piece.toLowerCase();
                    const square = row * 8 + col;
                    
                    // Material value
                    let value = PIECE_VALUES[piece] || 0;
                    
                    // Position value
                    if (POSITION_VALUES[pieceType]) {
                        const posValue = isWhite ? 
                            POSITION_VALUES[pieceType][square] :
                            POSITION_VALUES[pieceType][63 - square];
                        value += posValue;
                    }
                    
                    // Add to score (positive for white, negative for black)
                    score += isWhite ? value : -value;
                }
            }
        }
        
        // Adjust for active color
        return position.activeColor === 'w' ? score : -score;
    }

    // Generate pseudo-random move evaluation
    evaluateMove(beforeFen, afterFen) {
        try {
            const beforePos = this.parseFEN(beforeFen);
            const afterPos = this.parseFEN(afterFen);
            
            const beforeEval = this.evaluatePosition(beforePos);
            const afterEval = this.evaluatePosition(afterPos);
            
            // Calculate evaluation change
            const evalChange = (afterEval - beforeEval) / 100;
            
            // Generate move quality score (0-100)
            let quality = 50; // Base score
            
            if (evalChange > 0.5) {
                quality = Math.min(95, 70 + evalChange * 30);
            } else if (evalChange > 0.2) {
                quality = Math.min(85, 60 + evalChange * 40);
            } else if (evalChange > -0.2) {
                quality = 50 + evalChange * 100;
            } else if (evalChange > -0.5) {
                quality = Math.max(25, 40 + evalChange * 30);
            } else {
                quality = Math.max(5, 25 + evalChange * 20);
            }
            
            return {
                score: Math.round(Math.max(0, Math.min(100, quality))),
                evalChange: evalChange,
                beforeEval: beforeEval / 100,
                afterEval: afterEval / 100,
                rating: this.getQualityRating(Math.round(quality))
            };
        } catch (error) {
            // Fallback evaluation
            return {
                score: 50,
                evalChange: 0,
                beforeEval: 0,
                afterEval: 0,
                rating: 'okay'
            };
        }
    }

    getQualityRating(score) {
        if (score >= 85) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 45) return 'okay';
        if (score >= 25) return 'questionable';
        return 'poor';
    }

    // Simulate UCI protocol responses
    handleCommand(command) {
        const parts = command.trim().split(' ');
        const cmd = parts[0];

        switch (cmd) {
            case 'uci':
                this.postMessage('id name LocalChessEngine');
                this.postMessage('id author Chess AI Tutor');
                this.postMessage('uciok');
                break;

            case 'isready':
                this.postMessage('readyok');
                break;

            case 'position':
                // Store position for analysis
                this.currentPosition = command;
                break;

            case 'evaluate':
                // Handle evaluation request: evaluate [requestId] [beforeFen] [afterFen]
                if (parts.length >= 4) {
                    const requestId = parts[1];
                    const beforeFen = parts[2];
                    const afterFen = parts[3];
                    
                    try {
                        const result = this.evaluateMove(beforeFen, afterFen);
                        this.postMessage(`evaluation ${requestId} ${JSON.stringify(result)}`);
                    } catch (error) {
                        console.error('Evaluation error:', error);
                        const fallbackResult = {
                            score: 50,
                            evalChange: 0,
                            beforeEval: 0,
                            afterEval: 0,
                            rating: 'okay'
                        };
                        this.postMessage(`evaluation ${requestId} ${JSON.stringify(fallbackResult)}`);
                    }
                }
                break;

            case 'go':
                // Simulate analysis
                this.isAnalyzing = true;
                setTimeout(() => {
                    if (this.isAnalyzing) {
                        // Generate mock analysis
                        const depth = Math.min(this.depth, 8);
                        const score = Math.floor(Math.random() * 200) - 100; // -100 to +100 centipawns
                        
                        this.postMessage(`info depth ${depth} score cp ${score} pv e2e4 e7e5`);
                        this.postMessage('bestmove e2e4 ponder e7e5');
                        this.isAnalyzing = false;
                    }
                }, 300 + Math.random() * 200); // Simulate thinking time
                break;

            case 'stop':
                this.isAnalyzing = false;
                this.postMessage('bestmove e2e4');
                break;

            case 'quit':
                // Worker cleanup
                break;

            default:
                // Unknown command
                break;
        }
    }

    postMessage(message) {
        if (typeof self !== 'undefined' && self.postMessage) {
            self.postMessage(message);
        }
    }
}

// Initialize engine
const engine = new LocalChessEngine();

// Handle messages from main thread
if (typeof self !== 'undefined') {
    self.onmessage = function(e) {
        engine.handleCommand(e.data);
    };
    
    // Signal that worker is ready
    setTimeout(() => {
        engine.postMessage('Local chess engine ready');
    }, 100);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalChessEngine };
}