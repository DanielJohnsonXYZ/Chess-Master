// Chess Engine using chess.js library for proper chess rules implementation
// This wraps chess.js to maintain compatibility with existing ChessApp interface

class ChessEngine {
    constructor() {
        // Initialize chess.js instance
        this.chess = new Chess();

        // Maintain backward compatibility with existing code
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameOver = false;
        this.gameResult = null;
        this.moveCount = 1;
        this.waitingForAI = false;

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

    // Convert chess.js board to our 2D array format
    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Parse FEN to create board
        const fen = this.chess ? this.chess.fen() : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const rows = fen.split(' ')[0].split('/');

        for (let row = 0; row < 8; row++) {
            let col = 0;
            for (const char of rows[row]) {
                if (isNaN(char)) {
                    const piece = this.fenCharToPiece(char);
                    board[row][col] = piece;
                    col++;
                } else {
                    col += parseInt(char);
                }
            }
        }

        return board;
    }

    fenCharToPiece(char) {
        const pieceMap = {
            'p': { type: 'pawn', color: 'black' },
            'n': { type: 'knight', color: 'black' },
            'b': { type: 'bishop', color: 'black' },
            'r': { type: 'rook', color: 'black' },
            'q': { type: 'queen', color: 'black' },
            'k': { type: 'king', color: 'black' },
            'P': { type: 'pawn', color: 'white' },
            'N': { type: 'knight', color: 'white' },
            'B': { type: 'bishop', color: 'white' },
            'R': { type: 'rook', color: 'white' },
            'Q': { type: 'queen', color: 'white' },
            'K': { type: 'king', color: 'white' }
        };
        return pieceMap[char] || null;
    }

    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        if (!boardElement) return;

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
        if (this.gameOver || this.waitingForAI) return;

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
                if (window.chessApp && window.chessApp.playingAgainstAI &&
                    this.currentPlayer === window.chessApp.chessAI.color && !this.gameOver) {
                    this.waitingForAI = true;
                    setTimeout(() => {
                        window.chessApp.chessAI.makeMove(this);
                        this.waitingForAI = false;
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
            if (square) square.classList.add('selected');

            this.possibleMoves.forEach(([moveRow, moveCol]) => {
                const moveSquare = document.querySelector(`[data-row="${moveRow}"][data-col="${moveCol}"]`);
                if (moveSquare) moveSquare.classList.add('possible-move');
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

        return this.getPossibleMovesForPiece(row, col, piece);
    }

    getPossibleMovesForPiece(row, col, piece) {
        if (!piece) return [];

        const square = this.toAlgebraic(row, col);
        const moves = this.chess.moves({ square: square, verbose: true });

        return moves.map(move => this.fromAlgebraic(move.to));
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const from = this.toAlgebraic(fromRow, fromCol);
        const to = this.toAlgebraic(toRow, toCol);

        const moves = this.chess.moves({ verbose: true });
        return moves.some(move => move.from === from && move.to === to);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const from = this.toAlgebraic(fromRow, fromCol);
        const to = this.toAlgebraic(toRow, toCol);
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        // Check for pawn promotion
        let promotion = 'q'; // default to queen
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            // Show promotion dialog
            promotion = this.promptForPromotion() || 'q';
        }

        // Make move using chess.js
        const moveResult = this.chess.move({
            from: from,
            to: to,
            promotion: promotion
        });

        if (!moveResult) {
            console.error('Invalid move attempted:', from, to);
            return;
        }

        // Update our board representation
        this.board = this.initializeBoard();

        // Record move with notation
        const move = {
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            captured: capturedPiece,
            player: this.currentPlayer,
            moveNumber: Math.floor(this.moveHistory.length / 2) + 1,
            notation: moveResult.san,
            san: moveResult.san,
            lan: moveResult.lan || `${from}${to}`
        };

        this.moveHistory.push(move);

        // Handle capture
        if (capturedPiece) {
            const capturingPlayer = capturedPiece.color === 'white' ? 'black' : 'white';
            this.capturedPieces[capturingPlayer].push(capturedPiece);
            this.updateCapturedPieces();
        }

        // Get AI analysis for the move
        this.getAIFeedback(move);

        // Switch player
        this.switchPlayer();

        // Check for game ending conditions
        this.checkGameEnding();

        this.updateGameInfo();
        this.renderBoard();
        this.updateMoveHistory();
    }

    promptForPromotion() {
        const choice = prompt('Promote pawn to:\nq = Queen\nr = Rook\nb = Bishop\nn = Knight', 'q');
        return choice && ['q', 'r', 'b', 'n'].includes(choice.toLowerCase()) ? choice.toLowerCase() : 'q';
    }

    async getAIFeedback(move) {
        if (window.enhancedAI) {
            try {
                const gameState = {
                    board: this.board,
                    currentPlayer: this.currentPlayer,
                    moveHistory: this.moveHistory,
                    capturedPieces: this.capturedPieces,
                    fen: this.chess.fen()
                };

                const analysis = await window.enhancedAI.analyzeMove(move, gameState, this.moveHistory);
                this.displayAIFeedback(analysis);
            } catch (error) {
                console.log('Enhanced AI not available, using basic AI feedback');
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

        // Show check status
        if (this.chess.in_check()) {
            if (currentPlayerEl) {
                currentPlayerEl.textContent += ' (IN CHECK!)';
            }
        }
    }

    updateCapturedPieces() {
        const whiteCaptured = document.querySelector('.white-captured');
        const blackCaptured = document.querySelector('.black-captured');

        if (whiteCaptured) {
            whiteCaptured.innerHTML = this.capturedPieces.white
                .map(piece => `<span class="captured-piece">${this.pieceSymbols.white[piece.type]}</span>`)
                .join('');
        }

        if (blackCaptured) {
            blackCaptured.innerHTML = this.capturedPieces.black
                .map(piece => `<span class="captured-piece">${this.pieceSymbols.black[piece.type]}</span>`)
                .join('');
        }
    }

    updateMoveHistory() {
        const historyElement = document.getElementById('move-history');
        if (!historyElement) return;

        const recentMoves = this.moveHistory.slice(-10);

        historyElement.innerHTML = recentMoves.map(move => `
            <div class="move-entry">
                <span>${move.moveNumber}. ${move.notation}</span>
                <span>${move.player}</span>
            </div>
        `).join('');

        historyElement.scrollTop = historyElement.scrollHeight;
    }

    getMoveNotation(move) {
        return move.notation || move.san || 'Unknown';
    }

    getSquareNotation(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }

    toAlgebraic(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }

    fromAlgebraic(square) {
        const col = square.charCodeAt(0) - 97;
        const row = 8 - parseInt(square[1]);
        return [row, col];
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
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

    newGame() {
        try {
            // Reset chess.js
            this.chess.reset();

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
            this.waitingForAI = false;

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
        }
    }

    checkGameEnding() {
        if (this.chess.in_checkmate()) {
            this.gameOver = true;
            this.gameResult = `${this.currentPlayer === 'white' ? 'Black' : 'White'} wins by checkmate!`;
            this.showGameEndMessage();
        } else if (this.chess.in_stalemate()) {
            this.gameOver = true;
            this.gameResult = 'Draw by stalemate!';
            this.showGameEndMessage();
        } else if (this.chess.in_threefold_repetition()) {
            this.gameOver = true;
            this.gameResult = 'Draw by threefold repetition!';
            this.showGameEndMessage();
        } else if (this.chess.insufficient_material()) {
            this.gameOver = true;
            this.gameResult = 'Draw by insufficient material!';
            this.showGameEndMessage();
        } else if (this.chess.in_draw()) {
            this.gameOver = true;
            this.gameResult = 'Draw!';
            this.showGameEndMessage();
        }
    }

    getAllValidMovesForColor(color) {
        if (this.chess.turn() !== color[0]) {
            return [];
        }
        return this.chess.moves({ verbose: true });
    }

    isInCheck(color) {
        return this.chess.in_check() && this.chess.turn() === color[0];
    }

    isInsufficientMaterial() {
        return this.chess.insufficient_material();
    }

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

    // Additional helper methods for compatibility
    fen() {
        return this.chess.fen();
    }

    pgn() {
        return this.chess.pgn();
    }

    loadFen(fen) {
        this.chess.load(fen);
        this.board = this.initializeBoard();
        this.currentPlayer = this.chess.turn() === 'w' ? 'white' : 'black';
        this.renderBoard();
        this.updateGameInfo();
    }

    loadPgn(pgn) {
        this.chess.loadPgn(pgn);
        this.board = this.initializeBoard();
        this.currentPlayer = this.chess.turn() === 'w' ? 'white' : 'black';
        this.renderBoard();
        this.updateGameInfo();
    }
}
