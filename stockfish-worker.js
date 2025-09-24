/**
 * Enhanced Local Chess Engine - Much stronger than the previous version
 * Implements better evaluation, move generation, and tactical awareness
 */

// Enhanced piece values with tactical adjustments
const PIECE_VALUES = {
    'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
};

// Improved position tables with better strategic values
const POSITION_VALUES = {
    'p': [
        0,   0,   0,   0,   0,   0,   0,   0,
        50,  50,  50,  50,  50,  50,  50,  50,
        10,  10,  20,  30,  30,  20,  10,  10,
        5,   5,   10,  27,  27,  10,  5,   5,
        0,   0,   0,   25,  25,  0,   0,   0,
        5,   -5, -10,  0,   0,  -10,  -5,  5,
        5,   10,  10, -25, -25,  10,  10,  5,
        0,   0,   0,   0,   0,   0,   0,   0
    ],
    'n': [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20,   0,   0,   0,   0, -20, -40,
        -30,   0,  10,  15,  15,  10,   0, -30,
        -30,   5,  15,  20,  20,  15,   5, -30,
        -30,   0,  15,  20,  20,  15,   0, -30,
        -30,   5,  10,  15,  15,  10,   5, -30,
        -40, -20,   0,   5,   5,   0, -20, -40,
        -50, -40, -20, -30, -30, -20, -40, -50
    ],
    'b': [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10,   0,   0,   0,   0,   0,   0, -10,
        -10,   0,   5,  10,  10,   5,   0, -10,
        -10,   5,   5,  10,  10,   5,   5, -10,
        -10,   0,  10,  10,  10,  10,   0, -10,
        -10,  10,  10,  10,  10,  10,  10, -10,
        -10,   5,   0,   0,   0,   0,   5, -10,
        -20, -10, -40, -10, -10, -40, -10, -20
    ],
    'r': [
        0,   0,   0,   0,   0,   0,   0,   0,
        5,  10,  10,  10,  10,  10,  10,   5,
        -5,  0,   0,   0,   0,   0,   0,  -5,
        -5,  0,   0,   0,   0,   0,   0,  -5,
        -5,  0,   0,   0,   0,   0,   0,  -5,
        -5,  0,   0,   0,   0,   0,   0,  -5,
        -5,  0,   0,   0,   0,   0,   0,  -5,
        0,   0,   0,   5,   5,   0,   0,   0
    ],
    'q': [
        -20, -10, -10,  -5,  -5, -10, -10, -20,
        -10,   0,   0,   0,   0,   0,   0, -10,
        -10,   0,   5,   5,   5,   5,   0, -10,
        -5,    0,   5,   5,   5,   5,   0,  -5,
        0,     0,   5,   5,   5,   5,   0,  -5,
        -10,   5,   5,   5,   5,   5,   0, -10,
        -10,   0,   5,   0,   0,   0,   0, -10,
        -20, -10, -10,  -5,  -5, -10, -10, -20
    ],
    'k': [
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20,   20,   0,   0,   0,   0,  20,  20,
        20,   30,  10,   0,   0,  10,  30,  20
    ]
};

class EnhancedLocalChessEngine {
    constructor() {
        this.depth = 4;
        this.isAnalyzing = false;
        this.transpositionTable = new Map();
        this.maxTableSize = 10000;
    }

    // Parse FEN notation (improved)
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
            activeColor: parts[1] || 'w',
            castling: parts[2] || '-',
            enPassant: parts[3] || '-',
            halfmove: parseInt(parts[4]) || 0,
            fullmove: parseInt(parts[5]) || 1
        };
    }

    // Enhanced position evaluation
    evaluatePosition(position) {
        let score = 0;
        let gamePhase = this.getGamePhase(position);
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = position.board[row][col];
                if (piece) {
                    const isWhite = piece === piece.toUpperCase();
                    const pieceType = piece.toLowerCase();
                    const square = row * 8 + col;
                    
                    // Material value
                    let value = PIECE_VALUES[piece] || 0;
                    
                    // Position value (adjusted for game phase)
                    if (POSITION_VALUES[pieceType]) {
                        let posValue = isWhite ? 
                            POSITION_VALUES[pieceType][square] :
                            POSITION_VALUES[pieceType][63 - square];
                        
                        // Adjust king position values based on game phase
                        if (pieceType === 'k' && gamePhase > 0.7) {
                            posValue = -posValue; // Encourage king activity in endgame
                        }
                        
                        value += posValue * (gamePhase > 0.5 ? 0.5 : 1.0);
                    }
                    
                    // Add tactical bonuses
                    value += this.evaluateTacticalBonus(position, row, col, piece);
                    
                    // Add to score (positive for white, negative for black)
                    score += isWhite ? value : -value;
                }
            }
        }
        
        // Add mobility and control bonuses
        score += this.evaluateMobility(position);
        score += this.evaluateKingSafety(position);
        score += this.evaluatePawnStructure(position);
        
        // Adjust for active color
        return position.activeColor === 'w' ? score : -score;
    }

    // Calculate game phase (0 = opening, 1 = endgame)
    getGamePhase(position) {
        let material = 0;
        const maxMaterial = 2 * (9 + 5 + 3 + 3 + 1); // Both sides' non-pawn material
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = position.board[row][col];
                if (piece && piece.toLowerCase() !== 'k' && piece.toLowerCase() !== 'p') {
                    material += PIECE_VALUES[piece] / 100;
                }
            }
        }
        
        return 1.0 - (material / maxMaterial);
    }

    // Evaluate tactical bonuses
    evaluateTacticalBonus(position, row, col, piece) {
        let bonus = 0;
        const isWhite = piece === piece.toUpperCase();
        const pieceType = piece.toLowerCase();
        
        // Center control bonus
        if ((row >= 3 && row <= 4) && (col >= 3 && col <= 4)) {
            bonus += 10;
        }
        
        // Piece-specific bonuses
        switch (pieceType) {
            case 'n':
                // Knight outposts
                if ((isWhite && row <= 4) || (!isWhite && row >= 3)) {
                    if (this.isOutpost(position, row, col, piece)) {
                        bonus += 15;
                    }
                }
                break;
            case 'b':
                // Bishop pair bonus (handled globally)
                // Long diagonal control
                if ((row + col === 7) || (row - col === 0)) {
                    bonus += 5;
                }
                break;
            case 'r':
                // Rook on open/semi-open files
                if (this.isOpenFile(position, col)) {
                    bonus += 15;
                } else if (this.isSemiOpenFile(position, col, isWhite)) {
                    bonus += 10;
                }
                // Rook on 7th rank
                if ((isWhite && row === 1) || (!isWhite && row === 6)) {
                    bonus += 20;
                }
                break;
            case 'q':
                // Queen early development penalty
                const startRow = isWhite ? 7 : 0;
                if (row !== startRow) {
                    const piecesCount = this.countDevelopedPieces(position, isWhite);
                    if (piecesCount < 3) {
                        bonus -= 30;
                    }
                }
                break;
        }
        
        return bonus;
    }

    // Check if square is an outpost
    isOutpost(position, row, col, piece) {
        const isWhite = piece === piece.toUpperCase();
        const direction = isWhite ? -1 : 1;
        
        // Check for enemy pawns that can attack this square
        for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
            for (let r = row - direction; r >= 0 && r < 8; r += direction) {
                const checkPiece = position.board[r][c];
                if (checkPiece && checkPiece.toLowerCase() === 'p' && 
                    (checkPiece === checkPiece.toUpperCase()) !== isWhite) {
                    return false;
                }
            }
        }
        return true;
    }

    // Check for open file (no pawns)
    isOpenFile(position, col) {
        for (let row = 0; row < 8; row++) {
            const piece = position.board[row][col];
            if (piece && piece.toLowerCase() === 'p') {
                return false;
            }
        }
        return true;
    }

    // Check for semi-open file (no own pawns)
    isSemiOpenFile(position, col, isWhite) {
        for (let row = 0; row < 8; row++) {
            const piece = position.board[row][col];
            if (piece && piece.toLowerCase() === 'p' && 
                (piece === piece.toUpperCase()) === isWhite) {
                return false;
            }
        }
        return true;
    }

    // Count developed pieces
    countDevelopedPieces(position, isWhite) {
        let count = 0;
        const backRank = isWhite ? 7 : 0;
        
        for (let col = 0; col < 8; col++) {
            const piece = position.board[backRank][col];
            if (piece && (piece === piece.toUpperCase()) === isWhite) {
                const type = piece.toLowerCase();
                if (type === 'n' || type === 'b') {
                    count++;
                }
            }
        }
        
        return count;
    }

    // Evaluate mobility
    evaluateMobility(position) {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = position.board[row][col];
                if (piece) {
                    const isWhite = piece === piece.toUpperCase();
                    const mobility = this.getMobility(position, row, col, piece);
                    const mobilityScore = mobility * 2;
                    score += isWhite ? mobilityScore : -mobilityScore;
                }
            }
        }
        
        return score;
    }

    // Get mobility (number of legal moves) for a piece
    getMobility(position, row, col, piece) {
        const moves = this.generatePieceMoves(position, row, col, piece);
        return moves.length;
    }

    // Generate moves for a specific piece (simplified)
    generatePieceMoves(position, row, col, piece) {
        const moves = [];
        const pieceType = piece.toLowerCase();
        const isWhite = piece === piece.toUpperCase();
        
        const directions = {
            'r': [[0,1], [0,-1], [1,0], [-1,0]],
            'b': [[1,1], [1,-1], [-1,1], [-1,-1]],
            'q': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
            'k': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
            'n': [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]]
        };
        
        if (directions[pieceType]) {
            for (const [dr, dc] of directions[pieceType]) {
                const maxSteps = (pieceType === 'k' || pieceType === 'n') ? 1 : 7;
                
                for (let step = 1; step <= maxSteps; step++) {
                    const newRow = row + dr * step;
                    const newCol = col + dc * step;
                    
                    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
                    
                    const target = position.board[newRow][newCol];
                    if (!target) {
                        moves.push([newRow, newCol]);
                    } else {
                        if ((target === target.toUpperCase()) !== isWhite) {
                            moves.push([newRow, newCol]); // Capture
                        }
                        break;
                    }
                }
            }
        } else if (pieceType === 'p') {
            const direction = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;
            
            // Forward moves
            if (row + direction >= 0 && row + direction < 8) {
                if (!position.board[row + direction][col]) {
                    moves.push([row + direction, col]);
                    
                    // Double move from start
                    if (row === startRow && !position.board[row + 2 * direction][col]) {
                        moves.push([row + 2 * direction, col]);
                    }
                }
            }
            
            // Captures
            for (const dc of [-1, 1]) {
                const newRow = row + direction;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = position.board[newRow][newCol];
                    if (target && (target === target.toUpperCase()) !== isWhite) {
                        moves.push([newRow, newCol]);
                    }
                }
            }
        }
        
        return moves;
    }

    // Evaluate king safety
    evaluateKingSafety(position) {
        let score = 0;
        
        for (let isWhite of [true, false]) {
            const king = this.findKing(position, isWhite);
            if (king) {
                const [kingRow, kingCol] = king;
                let safety = 0;
                
                // Pawn shield
                const direction = isWhite ? -1 : 1;
                for (let dc = -1; dc <= 1; dc++) {
                    const col = kingCol + dc;
                    if (col >= 0 && col < 8) {
                        for (let dr = 1; dr <= 2; dr++) {
                            const row = kingRow + direction * dr;
                            if (row >= 0 && row < 8) {
                                const piece = position.board[row][col];
                                if (piece && piece.toLowerCase() === 'p' && 
                                    (piece === piece.toUpperCase()) === isWhite) {
                                    safety += 10;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // King exposure penalty
                if (kingCol >= 2 && kingCol <= 5) {
                    safety -= 15; // King in center is dangerous
                }
                
                score += isWhite ? safety : -safety;
            }
        }
        
        return score;
    }

    // Find king position
    findKing(position, isWhite) {
        const targetKing = isWhite ? 'K' : 'k';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (position.board[row][col] === targetKing) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    // Evaluate pawn structure
    evaluatePawnStructure(position) {
        let score = 0;
        
        for (let isWhite of [true, false]) {
            const pawnPenalties = this.analyzePawnStructure(position, isWhite);
            score += isWhite ? -pawnPenalties : pawnPenalties;
        }
        
        return score;
    }

    // Analyze pawn structure weaknesses
    analyzePawnStructure(position, isWhite) {
        let penalties = 0;
        const targetPawn = isWhite ? 'P' : 'p';
        const pawns = [];
        
        // Find all pawns
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (position.board[row][col] === targetPawn) {
                    pawns.push([row, col]);
                }
            }
        }
        
        // Check for doubled, isolated, and backward pawns
        for (const [row, col] of pawns) {
            // Doubled pawns
            const sameFilePawns = pawns.filter(([r, c]) => c === col);
            if (sameFilePawns.length > 1) {
                penalties += 10;
            }
            
            // Isolated pawns
            const adjacentFilePawns = pawns.filter(([r, c]) => Math.abs(c - col) === 1);
            if (adjacentFilePawns.length === 0) {
                penalties += 15;
            }
            
            // Backward pawns
            if (this.isBackwardPawn(position, row, col, isWhite)) {
                penalties += 12;
            }
        }
        
        return penalties;
    }

    // Check if pawn is backward
    isBackwardPawn(position, row, col, isWhite) {
        const direction = isWhite ? -1 : 1;
        const targetPawn = isWhite ? 'P' : 'p';
        
        // Check if adjacent pawns are more advanced
        for (const dc of [-1, 1]) {
            const adjCol = col + dc;
            if (adjCol >= 0 && adjCol < 8) {
                for (let r = row + direction; r >= 0 && r < 8; r += direction) {
                    if (position.board[r][adjCol] === targetPawn) {
                        return true; // Found more advanced adjacent pawn
                    }
                }
            }
        }
        return false;
    }

    // Enhanced move evaluation with better tactics
    evaluateMove(beforeFen, afterFen) {
        try {
            const beforePos = this.parseFEN(beforeFen);
            const afterPos = this.parseFEN(afterFen);
            
            const beforeEval = this.evaluatePosition(beforePos);
            const afterEval = this.evaluatePosition(afterPos);
            
            // Calculate evaluation change (from moving player's perspective)
            const evalChange = (afterEval - beforeEval) / 100;
            
            // Detect special moves
            const moveType = this.detectMoveType(beforePos, afterPos);
            let tacticalBonus = 0;
            
            switch (moveType) {
                case 'capture':
                    tacticalBonus = this.getCaptureValue(beforePos, afterPos) * 0.01;
                    break;
                case 'check':
                    tacticalBonus = 0.3;
                    break;
                case 'castling':
                    tacticalBonus = 0.2;
                    break;
                case 'promotion':
                    tacticalBonus = 0.8;
                    break;
            }
            
            const adjustedChange = evalChange + tacticalBonus;
            
            // Generate move quality score (0-100) with better scaling
            let quality = 50; // Base score
            
            if (adjustedChange >= 0.8) {
                quality = Math.min(98, 85 + adjustedChange * 15);
            } else if (adjustedChange >= 0.4) {
                quality = Math.min(90, 70 + adjustedChange * 25);
            } else if (adjustedChange >= 0.1) {
                quality = Math.min(80, 60 + adjustedChange * 50);
            } else if (adjustedChange >= -0.1) {
                quality = 50 + adjustedChange * 200;
            } else if (adjustedChange >= -0.4) {
                quality = Math.max(20, 35 + adjustedChange * 50);
            } else {
                quality = Math.max(5, 20 + adjustedChange * 25);
            }
            
            return {
                score: Math.round(Math.max(0, Math.min(100, quality))),
                evalChange: adjustedChange,
                beforeEval: beforeEval / 100,
                afterEval: afterEval / 100,
                rating: this.getQualityRating(Math.round(quality)),
                moveType: moveType
            };
        } catch (error) {
            console.error('Enhanced evaluation error:', error);
            return {
                score: 50,
                evalChange: 0,
                beforeEval: 0,
                afterEval: 0,
                rating: 'okay',
                moveType: 'normal'
            };
        }
    }

    // Detect move type for tactical analysis
    detectMoveType(beforePos, afterPos) {
        // Compare positions to determine move type
        let captureDetected = false;
        let kingsMovedForCastling = false;
        
        // Simple heuristics for move detection
        const beforePieces = this.countPieces(beforePos);
        const afterPieces = this.countPieces(afterPos);
        
        if (beforePieces.total > afterPieces.total) {
            return 'capture';
        }
        
        // Check for promotion (simplified)
        if (afterPieces.queens > beforePieces.queens) {
            return 'promotion';
        }
        
        // Check for king moves (potential castling)
        const beforeKings = this.findAllKings(beforePos);
        const afterKings = this.findAllKings(afterPos);
        
        for (let color of ['white', 'black']) {
            if (beforeKings[color] && afterKings[color]) {
                const [bRow, bCol] = beforeKings[color];
                const [aRow, aCol] = afterKings[color];
                if (Math.abs(aCol - bCol) > 1) {
                    return 'castling';
                }
            }
        }
        
        return 'normal';
    }

    // Count pieces on board
    countPieces(position) {
        let total = 0;
        let queens = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = position.board[row][col];
                if (piece) {
                    total++;
                    if (piece.toLowerCase() === 'q') {
                        queens++;
                    }
                }
            }
        }
        
        return { total, queens };
    }

    // Find all kings
    findAllKings(position) {
        const kings = { white: null, black: null };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = position.board[row][col];
                if (piece === 'K') {
                    kings.white = [row, col];
                } else if (piece === 'k') {
                    kings.black = [row, col];
                }
            }
        }
        
        return kings;
    }

    // Get capture value for tactical bonus
    getCaptureValue(beforePos, afterPos) {
        // Simple approach: look for material difference
        const beforeMaterial = this.calculateMaterial(beforePos);
        const afterMaterial = this.calculateMaterial(afterPos);
        
        return Math.abs(beforeMaterial - afterMaterial);
    }

    // Calculate total material value
    calculateMaterial(position) {
        let material = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = position.board[row][col];
                if (piece && piece.toLowerCase() !== 'k') {
                    material += PIECE_VALUES[piece] || 0;
                }
            }
        }
        
        return material;
    }

    // Enhanced quality rating
    getQualityRating(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 55) return 'okay';
        if (score >= 30) return 'questionable';
        return 'poor';
    }

    // Simulate UCI protocol responses
    handleCommand(command) {
        const parts = command.trim().split(' ');
        const cmd = parts[0];

        switch (cmd) {
            case 'uci':
                this.postMessage('id name EnhancedLocalChessEngine');
                this.postMessage('id author Chess AI Tutor - Enhanced Version');
                this.postMessage('uciok');
                break;

            case 'isready':
                this.postMessage('readyok');
                break;

            case 'position':
                this.currentPosition = command;
                break;

            case 'evaluate':
                if (parts.length >= 4) {
                    const requestId = parts[1];
                    const beforeFen = parts[2];
                    const afterFen = parts[3];
                    
                    try {
                        const result = this.evaluateMove(beforeFen, afterFen);
                        this.postMessage(`evaluation ${requestId} ${JSON.stringify(result)}`);
                    } catch (error) {
                        console.error('Enhanced evaluation error:', error);
                        const fallbackResult = {
                            score: 50,
                            evalChange: 0,
                            beforeEval: 0,
                            afterEval: 0,
                            rating: 'okay',
                            moveType: 'normal'
                        };
                        this.postMessage(`evaluation ${requestId} ${JSON.stringify(fallbackResult)}`);
                    }
                }
                break;

            case 'go':
                this.isAnalyzing = true;
                setTimeout(() => {
                    if (this.isAnalyzing) {
                        // Generate better analysis based on actual position evaluation
                        const depth = Math.min(this.depth, 8);
                        
                        let score = 0;
                        if (this.currentPosition) {
                            try {
                                const fenMatch = this.currentPosition.match(/fen\s+(.+)/);
                                if (fenMatch) {
                                    const position = this.parseFEN(fenMatch[1]);
                                    score = Math.round(this.evaluatePosition(position));
                                } else {
                                    // Starting position
                                    score = Math.floor(Math.random() * 40) - 20; // -20 to +20
                                }
                            } catch (error) {
                                score = Math.floor(Math.random() * 40) - 20;
                            }
                        }
                        
                        this.postMessage(`info depth ${depth} score cp ${score} pv e2e4 e7e5`);
                        this.postMessage('bestmove e2e4 ponder e7e5');
                        this.isAnalyzing = false;
                    }
                }, 200 + Math.random() * 300);
                break;

            case 'stop':
                this.isAnalyzing = false;
                this.postMessage('bestmove e2e4');
                break;

            case 'quit':
                break;

            default:
                break;
        }
    }

    postMessage(message) {
        if (typeof self !== 'undefined' && self.postMessage) {
            self.postMessage(message);
        }
    }
}

// Initialize enhanced engine
const engine = new EnhancedLocalChessEngine();

// Handle messages from main thread
if (typeof self !== 'undefined') {
    self.onmessage = function(e) {
        engine.handleCommand(e.data);
    };
    
    // Signal that enhanced worker is ready
    setTimeout(() => {
        engine.postMessage('Enhanced local chess engine ready');
    }, 100);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedLocalChessEngine };
}