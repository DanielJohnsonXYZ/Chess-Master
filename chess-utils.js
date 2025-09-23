class ChessUtils {
    static boardToFen(board, currentPlayer = 'white', moveCount = 1) {
        let fen = '';
        
        // Convert board to FEN notation
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += this.pieceToFenChar(piece);
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (row < 7) {
                fen += '/';
            }
        }
        
        // Add additional FEN components
        fen += ` ${currentPlayer === 'white' ? 'w' : 'b'}`;
        fen += ' KQkq'; // Castling rights (simplified)
        fen += ' -'; // En passant target square
        fen += ' 0'; // Halfmove clock
        fen += ` ${moveCount}`; // Fullmove number
        
        return fen;
    }
    
    static pieceToFenChar(piece) {
        const fenChars = {
            white: {
                king: 'K', queen: 'Q', rook: 'R',
                bishop: 'B', knight: 'N', pawn: 'P'
            },
            black: {
                king: 'k', queen: 'q', rook: 'r',
                bishop: 'b', knight: 'n', pawn: 'p'
            }
        };
        
        return fenChars[piece.color][piece.type] || '';
    }
    
    static moveToAlgebraic(move) {
        const fromSquare = this.positionToAlgebraic(move.from[0], move.from[1]);
        const toSquare = this.positionToAlgebraic(move.to[0], move.to[1]);
        return fromSquare + toSquare;
    }
    
    static positionToAlgebraic(row, col) {
        const file = String.fromCharCode(97 + col); // a-h
        const rank = (8 - row).toString(); // 1-8
        return file + rank;
    }
    
    static algebraicToPosition(algebraic) {
        if (algebraic.length !== 2) return null;
        const file = algebraic.charCodeAt(0) - 97; // a-h to 0-7
        const rank = 8 - parseInt(algebraic[1]); // 1-8 to 7-0
        return [rank, file];
    }
    
    static moveHistoryToAlgebraic(moveHistory) {
        return moveHistory.map(move => this.moveToAlgebraic(move));
    }
    
    static isValidMove(from, to) {
        // Basic validation for algebraic notation
        const fromPos = this.algebraicToPosition(from);
        const toPos = this.algebraicToPosition(to);
        return fromPos && toPos && 
               fromPos[0] >= 0 && fromPos[0] <= 7 && fromPos[1] >= 0 && fromPos[1] <= 7 &&
               toPos[0] >= 0 && toPos[0] <= 7 && toPos[1] >= 0 && toPos[1] <= 7;
    }
    
    static copyBoard(board) {
        return board.map(row => row.map(piece => piece ? { ...piece } : null));
    }
    
    static applyMoveToBoard(board, move) {
        const newBoard = this.copyBoard(board);
        const piece = newBoard[move.from[0]][move.from[1]];
        
        if (piece) {
            newBoard[move.to[0]][move.to[1]] = piece;
            newBoard[move.from[0]][move.from[1]] = null;
        }
        
        return newBoard;
    }
    
    static getBoardAfterMove(board, currentPlayer, move) {
        const newBoard = this.applyMoveToBoard(board, move);
        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
        return { board: newBoard, currentPlayer: nextPlayer };
    }
    
    static evaluationToWords(evaluation) {
        if (!evaluation) return 'Unknown position';
        
        const evalStr = evaluation.toString();
        
        if (evalStr.includes('Mate')) {
            const isPositive = !evalStr.includes('-');
            const moves = evalStr.match(/\d+/)?.[0] || '?';
            return isPositive ? `Winning: Mate in ${moves}` : `Losing: Mate in ${moves}`;
        }
        
        const score = parseFloat(evalStr);
        if (isNaN(score)) return 'Unclear position';
        
        if (score > 2) return 'Winning advantage';
        if (score > 1) return 'Significant advantage';
        if (score > 0.5) return 'Slight advantage';
        if (score > -0.5) return 'Balanced position';
        if (score > -1) return 'Slight disadvantage';
        if (score > -2) return 'Significant disadvantage';
        return 'Losing position';
    }
    
    static formatEvaluation(evaluation) {
        if (!evaluation) return { score: '0.00', description: 'Balanced' };
        
        const evalStr = evaluation.toString();
        
        if (evalStr.includes('Mate')) {
            return {
                score: evalStr,
                description: evalStr.includes('-') ? 'Mate threat!' : 'Mate opportunity!'
            };
        }
        
        const score = parseFloat(evalStr);
        if (isNaN(score)) {
            return { score: '0.00', description: 'Unclear' };
        }
        
        let description = 'Balanced';
        if (Math.abs(score) > 2) description = Math.abs(score) === score ? 'Winning' : 'Losing';
        else if (Math.abs(score) > 1) description = Math.abs(score) === score ? 'Advantage' : 'Disadvantage';
        else if (Math.abs(score) > 0.3) description = Math.abs(score) === score ? 'Slightly better' : 'Slightly worse';
        
        return {
            score: score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2),
            description
        };
    }
    
    static createInitialPosition() {
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
}

// Make available globally
window.ChessUtils = ChessUtils;