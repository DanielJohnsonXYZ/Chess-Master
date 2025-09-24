class ChessEngine {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameOver = false;
        this.gameResult = null;
        this.moveCount = 1;
        
        this.pieceSymbols = {
            white: {
                king: '♔', queen: '♕', rook: '♖',
                bishop: '♗', knight: '♘', pawn: '♙'
            },
            black: {
                king: '♚', queen: '♛', rook: '♜',
                bishop: '♝', knight: '♞', pawn: '♟'
            }
        };
    }
    
    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place black pieces
        const blackPieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: blackPieces[col], color: 'black' };
            board[1][col] = { type: 'pawn', color: 'black' };
        }
        
        // Place white pieces
        const whitePieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let col = 0; col < 8; col++) {
            board[7][col] = { type: whitePieces[col], color: 'white' };
            board[6][col] = { type: 'pawn', color: 'white' };
        }
        
        return board;
    }
    
    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = this.pieceSymbols[piece.color][piece.type];
                }
                
                square.addEventListener('click', (e) => this.handleSquareClick(e));
                boardElement.appendChild(square);
            }
        }
    }
    
    handleSquareClick(event) {
        if (this.gameOver) return;
        
        // Block human moves when playing against AI and it's AI's turn
        if (window.chessApp && window.chessApp.playingAgainstAI && 
            this.currentPlayer === window.chessApp.chessAI.color) {
            return;
        }
        
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            
            if (row === selectedRow && col === selectedCol) {
                this.clearSelection();
                return;
            }
            
            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
                this.updateGameInfo();
                
                // Trigger AI feedback (async)
                if (window.aiTutor) {
                    window.aiTutor.analyzeMoveAndProvideFeedback(this.moveHistory[this.moveHistory.length - 1]);
                }
                
                // Check if AI should make a move
                if (window.chessApp && window.chessApp.playingAgainstAI && this.currentPlayer === window.chessApp.chessAI.color && !this.gameOver) {
                    setTimeout(() => {
                        window.chessApp.chessAI.makeMove(this);
                    }, 100);
                }
            } else {
                this.selectSquare(row, col);
            }
        } else {
            this.selectSquare(row, col);
        }
    }
    
    selectSquare(row, col) {
        const piece = this.board[row][col];
        if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = [row, col];
            this.possibleMoves = this.getPossibleMoves(row, col);
            this.highlightSelection();
        }
    }
    
    clearSelection() {
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.clearHighlights();
    }
    
    highlightSelection() {
        this.clearHighlights();
        
        if (this.selectedSquare) {
            const [row, col] = this.selectedSquare;
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            square.classList.add('selected');
            
            this.possibleMoves.forEach(([moveRow, moveCol]) => {
                const moveSquare = document.querySelector(`[data-row="${moveRow}"][data-col="${moveCol}"]`);
                moveSquare.classList.add('possible-move');
            });
        }
    }
    
    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'possible-move');
        });
    }
    
    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.currentPlayer) return [];
        
        const moves = [];
        
        switch (piece.type) {
            case 'pawn':
                moves.push(...this.getPawnMoves(row, col, piece.color));
                break;
            case 'rook':
                moves.push(...this.getRookMoves(row, col, piece.color));
                break;
            case 'knight':
                moves.push(...this.getKnightMoves(row, col, piece.color));
                break;
            case 'bishop':
                moves.push(...this.getBishopMoves(row, col, piece.color));
                break;
            case 'queen':
                moves.push(...this.getQueenMoves(row, col, piece.color));
                break;
            case 'king':
                moves.push(...this.getKingMoves(row, col, piece.color));
                break;
        }
        
        return moves.filter(([r, c]) => this.isInBounds(r, c) && !this.wouldBeInCheck(row, col, r, c));
    }
    
    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        
        // Forward move
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push([row + direction, col]);
            
            // Two squares forward from starting position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }
        
        // Diagonal captures
        for (const dc of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + dc;
            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (targetPiece && targetPiece.color !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        }
        
        return moves;
    }
    
    getRookMoves(row, col, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dr;
                const newCol = col + i * dc;
                
                if (!this.isInBounds(newRow, newCol)) break;
                
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (targetPiece.color !== color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }
        
        return moves;
    }
    
    getKnightMoves(row, col, color) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dr, dc] of knightMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        }
        
        return moves;
    }
    
    getBishopMoves(row, col, color) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dr;
                const newCol = col + i * dc;
                
                if (!this.isInBounds(newRow, newCol)) break;
                
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (targetPiece.color !== color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }
        
        return moves;
    }
    
    getQueenMoves(row, col, color) {
        return [...this.getRookMoves(row, col, color), ...this.getBishopMoves(row, col, color)];
    }
    
    getKingMoves(row, col, color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        }
        
        return moves;
    }
    
    isValidMove(fromRow, fromCol, toRow, toCol) {
        // Check if source square has a piece
        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;
        
        // Get possible moves for this piece
        const possibleMoves = this.getPossibleMoves(fromRow, fromCol);
        return possibleMoves.some(([r, c]) => r === toRow && c === toCol);
    }
    
    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // Record move
        const move = {
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            captured: capturedPiece,
            player: this.currentPlayer,
            moveNumber: Math.ceil(this.moveHistory.length / 2) + 1
        };
        
        this.moveHistory.push(move);
        
        // Handle capture
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
            this.updateCapturedPieces();
        }
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Get AI analysis for the move using enhanced AI if available
        this.getAIFeedback(move);
        
        // Switch player after getting feedback
        this.switchPlayer();
        
        // Check for game ending conditions
        this.checkGameEnding();
        
        this.updateGameInfo();
        this.renderBoard();
        this.updateMoveHistory();
    }
    
    async getAIFeedback(move) {
        if (window.enhancedAI) {
            try {
                const gameState = {
                    board: this.board,
                    currentPlayer: this.currentPlayer,
                    moveHistory: this.moveHistory,
                    capturedPieces: this.capturedPieces
                };
                
                const analysis = await window.enhancedAI.analyzeMove(move, gameState, this.moveHistory);
                this.displayAIFeedback(analysis);
            } catch (error) {
                console.log('Enhanced AI not available, using basic AI feedback');
                // Fallback to basic AI tutor
                if (window.aiTutor) {
                    window.aiTutor.analyzeMoveAndProvideFeedback(move);
                }
            }
        } else if (window.aiTutor) {
            window.aiTutor.analyzeMoveAndProvideFeedback(move);
        }
    }
    
    displayAIFeedback(analysis) {
        const feedbackElement = document.getElementById('tutor-feedback');
        if (!feedbackElement) return;
        
        const ratingColors = {
            excellent: '#22c55e',
            good: '#3b82f6', 
            okay: '#6b7280',
            questionable: '#f59e0b',
            poor: '#ef4444'
        };
        
        const ratingColor = ratingColors[analysis.rating] || '#6b7280';
        
        const feedbackHtml = `
            <div class="ai-feedback">
                <div class="feedback-rating" style="color: ${ratingColor}; font-weight: 600; margin-bottom: 12px; padding: 8px; background-color: rgba(${ratingColor === '#22c55e' ? '34, 197, 94' : ratingColor === '#3b82f6' ? '59, 130, 246' : ratingColor === '#f59e0b' ? '245, 158, 11' : ratingColor === '#ef4444' ? '239, 68, 68' : '107, 114, 128'}, 0.1); border-radius: 6px; text-align: center;">
                    ${analysis.rating ? analysis.rating.toUpperCase() : 'OKAY'} MOVE
                </div>
                <div class="feedback-main" style="margin-bottom: 16px; line-height: 1.5;">
                    ${analysis.feedback || analysis.mainFeedback || 'Move analyzed successfully.'}
                </div>
                ${analysis.tacticalAnalysis && analysis.tacticalAnalysis !== 'undefined' ? `
                    <div class="feedback-tactical" style="margin-bottom: 12px; font-size: 0.875rem; padding: 8px; background-color: var(--color-background-subtle); border-radius: 6px;">
                        <strong>🎯 Tactical:</strong> ${analysis.tacticalAnalysis}
                    </div>
                ` : ''}
                ${analysis.strategicAnalysis && analysis.strategicAnalysis !== 'undefined' ? `
                    <div class="feedback-strategic" style="margin-bottom: 12px; font-size: 0.875rem; padding: 8px; background-color: var(--color-background-subtle); border-radius: 6px;">
                        <strong>📋 Strategic:</strong> ${analysis.strategicAnalysis}
                    </div>
                ` : ''}
                ${analysis.suggestions && analysis.suggestions.length > 0 ? `
                    <div class="feedback-suggestions" style="margin-top: 16px;">
                        <strong style="color: var(--color-accent);">💡 Suggestions:</strong>
                        <ul style="margin: 8px 0 0 20px; font-size: 0.875rem; line-height: 1.6;">
                            ${analysis.suggestions.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${analysis.learningPoint && analysis.learningPoint !== 'undefined' ? `
                    <div class="feedback-learning" style="margin-top: 16px; padding: 12px; background-color: var(--color-accent-subtle); border-radius: 8px; font-size: 0.875rem; border-left: 4px solid var(--color-accent); color: var(--color-foreground);">
                        <strong style="color: var(--color-foreground);">🎓 Learning Point:</strong> ${analysis.learningPoint}
                    </div>
                ` : ''}
            </div>
        `;
        
        feedbackElement.innerHTML = feedbackHtml;
    }
    
    displayBasicFeedback(feedback) {
        const feedbackElement = document.getElementById('tutor-feedback');
        if (!feedbackElement) return;
        
        const feedbackHtml = `
            <div class="basic-feedback">
                <p>${feedback}</p>
            </div>
        `;
        
        feedbackElement.innerHTML = feedbackHtml;
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        if (this.currentPlayer === 'white') {
            this.moveCount++;
        }
    }
    
    updateGameInfo() {
        const currentPlayerEl = document.getElementById('current-player');
        const moveCounterEl = document.getElementById('move-counter');
        
        if (currentPlayerEl) {
            currentPlayerEl.textContent = 
                `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} to move`;
        }
        
        if (moveCounterEl) {
            moveCounterEl.textContent = `Move: ${this.moveCount}`;
        }
    }
    
    updateCapturedPieces() {
        const whiteCaptured = document.querySelector('.white-captured');
        const blackCaptured = document.querySelector('.black-captured');
        
        whiteCaptured.innerHTML = this.capturedPieces.white
            .map(piece => `<span class="captured-piece">${this.pieceSymbols.white[piece.type]}</span>`)
            .join('');
            
        blackCaptured.innerHTML = this.capturedPieces.black
            .map(piece => `<span class="captured-piece">${this.pieceSymbols.black[piece.type]}</span>`)
            .join('');
    }
    
    updateMoveHistory() {
        const historyElement = document.getElementById('move-history');
        const recentMoves = this.moveHistory.slice(-10);
        
        historyElement.innerHTML = recentMoves.map(move => `
            <div class="move-entry">
                <span>${move.moveNumber}. ${this.getMoveNotation(move)}</span>
                <span>${move.player}</span>
            </div>
        `).join('');
        
        historyElement.scrollTop = historyElement.scrollHeight;
    }
    
    getMoveNotation(move) {
        // Defensive programming - check if move object is valid
        if (!move || !move.piece || !move.to || !move.from) {
            console.error('Invalid move object:', move);
            return 'Invalid';
        }
        
        if (!Array.isArray(move.to) || move.to.length !== 2 || 
            !Array.isArray(move.from) || move.from.length !== 2) {
            console.error('Invalid move coordinates:', move);
            return 'Invalid';
        }
        
        try {
            const pieceSymbol = move.piece.type === 'pawn' ? '' : 
                move.piece.type.charAt(0).toUpperCase();
            const toSquare = this.getSquareNotation(move.to[0], move.to[1]);
            const capture = move.captured ? 'x' : '';
            
            // For pawns, include file letter if capturing
            if (move.piece.type === 'pawn' && move.captured) {
                const fromFile = String.fromCharCode(97 + move.from[1]);
                return `${fromFile}${capture}${toSquare}`;
            }
            
            return `${pieceSymbol}${capture}${toSquare}`;
        } catch (error) {
            console.error('Error generating move notation:', error, move);
            return 'Error';
        }
    }
    
    getSquareNotation(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }
    
    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Create a temporary board state after the proposed move
        const originalPiece = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];
        
        // Temporarily make the move
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;
        
        // Find the king of the current player
        const kingPosition = this.findKing(movingPiece.color);
        let inCheck = false;
        
        if (kingPosition) {
            // Check if any opponent piece can attack the king
            inCheck = this.isSquareAttacked(kingPosition[0], kingPosition[1], movingPiece.color === 'white' ? 'black' : 'white');
        }
        
        // Restore the original board state
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalPiece;
        
        return inCheck;
    }
    
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return [row, col];
                }
            }
        }
        return null;
    }
    
    isSquareAttacked(targetRow, targetCol, attackingColor) {
        // Check if any piece of the attacking color can reach the target square
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === attackingColor) {
                    const moves = this.getPieceAttackMoves(row, col, piece);
                    if (moves.some(([r, c]) => r === targetRow && c === targetCol)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    getPieceAttackMoves(row, col, piece) {
        // Get raw attack moves without check validation to avoid infinite recursion
        switch (piece.type) {
            case 'pawn':
                return this.getPawnAttackMoves(row, col, piece.color);
            case 'rook':
                return this.getRookMoves(row, col, piece.color);
            case 'knight':
                return this.getKnightMoves(row, col, piece.color);
            case 'bishop':
                return this.getBishopMoves(row, col, piece.color);
            case 'queen':
                return this.getQueenMoves(row, col, piece.color);
            case 'king':
                return this.getKingAttackMoves(row, col, piece.color);
            default:
                return [];
        }
    }
    
    getPawnAttackMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        
        // Pawns only attack diagonally
        for (const dc of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + dc;
            if (this.isInBounds(newRow, newCol)) {
                moves.push([newRow, newCol]);
            }
        }
        
        return moves;
    }
    
    getKingAttackMoves(row, col, color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol)) {
                moves.push([newRow, newCol]);
            }
        }
        
        return moves;
    }
    
    newGame() {
        try {
            // Reset all game state
            this.board = this.initializeBoard();
            this.currentPlayer = 'white';
            this.moveHistory = [];
            this.capturedPieces = { white: [], black: [] };
            this.selectedSquare = null;
            this.possibleMoves = [];
            this.gameOver = false;
            this.gameResult = null;
            this.moveCount = 1;
            
            // Clear any existing highlights
            this.clearHighlights();
            
            // Re-render everything
            this.renderBoard();
            this.updateGameInfo();
            this.updateCapturedPieces();
            this.updateMoveHistory();
            
            // Clear AI feedback
            const feedbackElement = document.getElementById('tutor-feedback');
            if (feedbackElement) {
                feedbackElement.innerHTML = 
                    '<p>New game started! Make your first move to begin receiving guidance.</p>';
            }
            
            // Reset AI tutor state
            if (window.aiTutor) {
                window.aiTutor.startNewGame();
            }
            
            console.log('New game initialized successfully');
        } catch (error) {
            console.error('Error starting new game:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'New Game');
            }
        }
    }
    
    // Check for game ending conditions
    checkGameEnding() {
        const validMoves = this.getAllValidMovesForColor(this.currentPlayer);
        const inCheck = this.isInCheck(this.currentPlayer);
        
        if (validMoves.length === 0) {
            this.gameOver = true;
            if (inCheck) {
                // Checkmate
                this.gameResult = `${this.currentPlayer === 'white' ? 'Black' : 'White'} wins by checkmate!`;
                console.log('Game ended: Checkmate');
            } else {
                // Stalemate
                this.gameResult = 'Draw by stalemate!';
                console.log('Game ended: Stalemate');
            }
            
            // Show game ending message
            this.showGameEndMessage();
        } else if (this.isInsufficientMaterial()) {
            // Draw by insufficient material
            this.gameOver = true;
            this.gameResult = 'Draw by insufficient material!';
            this.showGameEndMessage();
        }
    }
    
    // Get all valid moves for a color
    getAllValidMovesForColor(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.getPossibleMoves(row, col);
                    moves.push(...pieceMoves);
                }
            }
        }
        return moves;
    }
    
    // Check if king is in check
    isInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;
        
        return this.isSquareAttacked(kingPosition[0], kingPosition[1], color === 'white' ? 'black' : 'white');
    }
    
    // Check for insufficient material
    isInsufficientMaterial() {
        const pieces = { white: [], black: [] };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    pieces[piece.color].push(piece.type);
                }
            }
        }
        
        // King vs King
        if (pieces.white.length === 1 && pieces.black.length === 1) {
            return true;
        }
        
        // King + Bishop/Knight vs King
        const whitePieces = pieces.white.filter(p => p !== 'king');
        const blackPieces = pieces.black.filter(p => p !== 'king');
        
        if ((whitePieces.length === 0 && blackPieces.length === 1 && ['bishop', 'knight'].includes(blackPieces[0])) ||
            (blackPieces.length === 0 && whitePieces.length === 1 && ['bishop', 'knight'].includes(whitePieces[0]))) {
            return true;
        }
        
        return false;
    }
    
    // Show game ending message
    showGameEndMessage() {
        const feedbackElement = document.getElementById('tutor-feedback');
        const currentPlayerEl = document.getElementById('current-player');
        
        if (feedbackElement) {
            feedbackElement.innerHTML = `
                <div class="game-end-message" style="padding: 16px; background: var(--color-accent-subtle); border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0 0 8px 0; color: var(--color-accent);">${this.gameResult}</h3>
                    <p style="margin: 0; font-size: 0.875rem;">Click "New Game" to play again.</p>
                </div>
            `;
        }
        
        if (currentPlayerEl) {
            currentPlayerEl.textContent = this.gameResult;
        }
    }
}