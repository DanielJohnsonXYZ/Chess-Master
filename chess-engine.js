class ChessEngine {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameOver = false;
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
                this.switchPlayer();
                this.updateGameInfo();
                
                // Trigger AI feedback
                window.aiTutor?.analyzeMoveAndProvideFeedback(this.moveHistory[this.moveHistory.length - 1]);
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
        return this.possibleMoves.some(([r, c]) => r === toRow && c === toCol);
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
        
        this.renderBoard();
        this.updateMoveHistory();
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        if (this.currentPlayer === 'white') {
            this.moveCount++;
        }
    }
    
    updateGameInfo() {
        document.getElementById('current-player').textContent = 
            `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} to move`;
        document.getElementById('move-counter').textContent = `Move: ${this.moveCount}`;
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
        const pieceSymbol = move.piece.type === 'pawn' ? '' : 
            move.piece.type.charAt(0).toUpperCase();
        const fromSquare = this.getSquareNotation(move.from[0], move.from[1]);
        const toSquare = this.getSquareNotation(move.to[0], move.to[1]);
        const capture = move.captured ? 'x' : '-';
        
        return `${pieceSymbol}${fromSquare}${capture}${toSquare}`;
    }
    
    getSquareNotation(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }
    
    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Simple check detection - would need full implementation for real game
        return false;
    }
    
    newGame() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameOver = false;
        this.moveCount = 1;
        
        this.renderBoard();
        this.updateGameInfo();
        this.updateCapturedPieces();
        this.updateMoveHistory();
        
        document.getElementById('tutor-feedback').innerHTML = 
            '<p>New game started! Make your first move to begin receiving guidance.</p>';
    }
}