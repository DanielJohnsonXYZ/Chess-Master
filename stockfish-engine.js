class StockfishEngine {
    constructor() {
        this.engine = null;
        this.isReady = false;
        this.depth = 10;
        this.searchTime = 1000; // 1 second
        this.callbacks = {
            onReady: null,
            onEvaluation: null,
            onBestMove: null,
            onError: null
        };
        this.pendingCallbacks = new Map();
        this.commandId = 0;
        this.initializeEngine();
    }

    async initializeEngine() {
        try {
            // Try external Stockfish sources first
            const stockfishSources = [
                'https://cdn.jsdelivr.net/npm/stockfish@15.0.0/src/stockfish.js',
                'https://unpkg.com/stockfish@15.0.0/src/stockfish.js'
            ];
            
            for (const src of stockfishSources) {
                try {
                    // Use timeout with fallback if asyncHelper not available
                    const loadPromise = this.loadStockfishScript(src);
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Load timeout')), 5000);
                    });
                    
                    await Promise.race([loadPromise, timeoutPromise]);
                    this.loadEngine(src);
                    console.log('External Stockfish engine loaded successfully');
                    return;
                } catch (error) {
                    console.warn(`Failed to load Stockfish from ${src}:`, error);
                }
            }
            
            // Fallback to local engine
            console.log('Falling back to local chess engine');
            this.loadLocalEngine();
            
        } catch (error) {
            console.error('Error initializing chess engine:', error);
            this.callbacks.onError?.(error.message);
        }
    }

    loadStockfishScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    loadEngine(workerSrc) {
        try {
            // Create Stockfish worker
            this.engine = new Worker(workerSrc);
            
            this.engine.onmessage = (event) => {
                this.handleEngineMessage(event.data);
            };

            this.engine.onerror = (error) => {
                console.error('Stockfish worker error:', error);
                this.callbacks.onError?.(error.message);
            };

            // Initialize UCI protocol
            this.sendCommand('uci');
        } catch (error) {
            console.error('Error loading Stockfish engine:', error);
            this.callbacks.onError?.(error.message);
        }
    }

    loadLocalEngine() {
        try {
            // Create local chess engine worker
            this.engine = new Worker('stockfish-worker.js');
            this.isLocalEngine = true;
            
            this.engine.onmessage = (event) => {
                this.handleEngineMessage(event.data);
            };

            this.engine.onerror = (error) => {
                console.error('Local engine worker error:', error);
                this.callbacks.onError?.(error.message);
            };

            // Initialize UCI protocol
            this.sendCommand('uci');
        } catch (error) {
            console.error('Error loading local engine:', error);
            this.callbacks.onError?.(error.message);
        }
    }

    handleEngineMessage(message) {
        const line = message.trim();
        
        if (line === 'uciok') {
            this.sendCommand('isready');
        } else if (line === 'readyok') {
            this.isReady = true;
            this.callbacks.onReady?.();
        } else if (line.startsWith('info')) {
            this.parseInfoLine(line);
        } else if (line.startsWith('bestmove')) {
            this.parseBestMove(line);
        } else if (line.startsWith('evaluation')) {
            this.parseEvaluationResponse(line);
        } else if (line.includes('ready') && this.isLocalEngine) {
            // Local engine is ready
            this.isReady = true;
            this.callbacks.onReady?.();
        }
    }

    parseEvaluationResponse(line) {
        // Parse: "evaluation [requestId] [result]"
        const parts = line.split(' ');
        if (parts.length >= 3) {
            const requestId = parseInt(parts[1]);
            const resultJson = parts.slice(2).join(' ');
            
            if (this.pendingEvaluations && this.pendingEvaluations.has(requestId)) {
                try {
                    const result = JSON.parse(resultJson);
                    const resolve = this.pendingEvaluations.get(requestId);
                    this.pendingEvaluations.delete(requestId);
                    resolve(result);
                } catch (error) {
                    console.error('Error parsing evaluation result:', error);
                }
            }
        }
    }

    parseInfoLine(line) {
        // Parse evaluation info from Stockfish
        const parts = line.split(' ');
        let depth = null;
        let score = null;
        let scoreType = null;
        let pv = [];

        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === 'depth') {
                depth = parseInt(parts[i + 1]);
            } else if (parts[i] === 'score') {
                scoreType = parts[i + 1];
                score = parseInt(parts[i + 2]);
            } else if (parts[i] === 'pv') {
                pv = parts.slice(i + 1);
                break;
            }
        }

        if (depth && score !== null) {
            const evaluation = {
                depth,
                score,
                scoreType,
                pv,
                evaluation: this.convertScoreToEvaluation(score, scoreType)
            };
            this.callbacks.onEvaluation?.(evaluation);
        }
    }

    parseBestMove(line) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        const ponder = parts.length > 3 ? parts[3] : null;
        
        this.callbacks.onBestMove?.({ bestMove, ponder });
    }

    convertScoreToEvaluation(score, scoreType) {
        if (scoreType === 'mate') {
            return score > 0 ? `Mate in ${score}` : `Mate in ${Math.abs(score)}`;
        } else if (scoreType === 'cp') {
            // Convert centipawns to evaluation
            const evaluation = score / 100;
            if (evaluation > 0) {
                return `+${evaluation.toFixed(2)}`;
            } else {
                return evaluation.toFixed(2);
            }
        }
        return '0.00';
    }

    sendCommand(command) {
        if (!this.engine) {
            console.error('Stockfish engine not initialized');
            return;
        }
        this.engine.postMessage(command);
    }

    setPosition(fen) {
        if (!this.isReady) {
            console.warn('Stockfish engine not ready');
            return;
        }
        this.sendCommand(`position fen ${fen}`);
    }

    setPositionFromMoves(moves) {
        if (!this.isReady) {
            console.warn('Stockfish engine not ready');
            return;
        }
        const moveString = moves.join(' ');
        this.sendCommand(`position startpos moves ${moveString}`);
    }

    analyzePosition(fen, options = {}) {
        if (!this.isReady) {
            console.warn('Stockfish engine not ready');
            return;
        }

        const depth = options.depth || this.depth;
        const time = options.time || this.searchTime;

        this.setPosition(fen);
        this.sendCommand(`go depth ${depth} movetime ${time}`);
    }

    findBestMove(fen, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isReady) {
                reject(new Error('Stockfish engine not ready'));
                return;
            }

            const depth = options.depth || this.depth;
            const time = options.time || this.searchTime;

            // Set up callback for this specific request
            const originalCallback = this.callbacks.onBestMove;
            this.callbacks.onBestMove = (result) => {
                this.callbacks.onBestMove = originalCallback;
                resolve(result);
            };

            this.setPosition(fen);
            this.sendCommand(`go depth ${depth} movetime ${time}`);
        });
    }

    evaluatePosition(fen, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isReady) {
                reject(new Error('Stockfish engine not ready'));
                return;
            }

            const depth = options.depth || this.depth;
            const time = options.time || this.searchTime;

            let bestEvaluation = null;

            // Set up callback for this specific request
            const originalEvalCallback = this.callbacks.onEvaluation;
            const originalBestMoveCallback = this.callbacks.onBestMove;

            this.callbacks.onEvaluation = (evaluation) => {
                if (evaluation.depth >= depth - 2) { // Accept evaluation near target depth
                    bestEvaluation = evaluation;
                }
            };

            this.callbacks.onBestMove = (result) => {
                this.callbacks.onEvaluation = originalEvalCallback;
                this.callbacks.onBestMove = originalBestMoveCallback;
                resolve({
                    bestMove: result.bestMove,
                    evaluation: bestEvaluation
                });
            };

            this.setPosition(fen);
            this.sendCommand(`go depth ${depth} movetime ${time}`);
        });
    }

    async getMoveQuality(beforeFen, afterFen, options = {}) {
        try {
            // If using local engine, use direct evaluation
            if (this.isLocalEngine) {
                return this.evaluateWithLocalEngine(beforeFen, afterFen);
            }
            
            const beforeEval = await this.evaluatePosition(beforeFen, options);
            const afterEval = await this.evaluatePosition(afterFen, options);

            const quality = this.calculateMoveQuality(beforeEval, afterEval);
            return quality;
        } catch (error) {
            console.error('Chess engine move quality error:', error);
            throw error;
        }
    }

    evaluateWithLocalEngine(beforeFen, afterFen) {
        return new Promise((resolve) => {
            // Send evaluation request to local engine
            const requestId = Date.now();
            this.pendingEvaluations = this.pendingEvaluations || new Map();
            
            this.pendingEvaluations.set(requestId, resolve);
            
            // Send custom evaluation command
            this.engine.postMessage(`evaluate ${requestId} ${beforeFen} ${afterFen}`);
            
            // Timeout fallback
            setTimeout(() => {
                if (this.pendingEvaluations.has(requestId)) {
                    this.pendingEvaluations.delete(requestId);
                    resolve({
                        score: 50,
                        evalChange: 0,
                        beforeEval: 0,
                        afterEval: 0,
                        rating: 'okay'
                    });
                }
            }, 2000);
        });
    }

    calculateMoveQuality(beforeEval, afterEval) {
        // Convert evaluations to numeric values for comparison
        const beforeScore = this.parseEvaluationScore(beforeEval.evaluation?.evaluation || '0.00');
        const afterScore = this.parseEvaluationScore(afterEval.evaluation?.evaluation || '0.00');

        // Calculate the change in evaluation (from opponent's perspective)
        const evalChange = -(afterScore - beforeScore);

        // Convert evaluation change to move quality rating (0-100)
        let quality = 50; // Base quality

        if (evalChange >= 0.5) {
            quality = 90 + Math.min(10, evalChange * 5); // Excellent move
        } else if (evalChange >= 0.2) {
            quality = 75 + (evalChange - 0.2) * 50; // Good move
        } else if (evalChange >= -0.1) {
            quality = 50 + evalChange * 250; // Neutral to okay move
        } else if (evalChange >= -0.3) {
            quality = 30 + (evalChange + 0.3) * 100; // Questionable move
        } else {
            quality = Math.max(0, 30 + evalChange * 50); // Poor move
        }

        return {
            score: Math.round(Math.max(0, Math.min(100, quality))),
            evalChange,
            beforeEval: beforeScore,
            afterEval: afterScore,
            rating: this.getQualityRating(Math.round(quality))
        };
    }

    parseEvaluationScore(evalString) {
        if (typeof evalString === 'number') return evalString;
        if (evalString.includes('Mate')) return evalString.includes('-') ? -10 : 10;
        return parseFloat(evalString) || 0;
    }

    getQualityRating(score) {
        if (score >= 85) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 45) return 'okay';
        if (score >= 25) return 'questionable';
        return 'poor';
    }

    setDepth(depth) {
        this.depth = Math.max(1, Math.min(20, depth));
    }

    setSearchTime(time) {
        this.searchTime = Math.max(100, Math.min(10000, time));
    }

    stop() {
        if (this.engine) {
            this.sendCommand('stop');
        }
    }

    quit() {
        if (this.engine) {
            this.sendCommand('quit');
            this.engine.terminate();
            this.engine = null;
            this.isReady = false;
        }
    }

    // Callback setters
    onReady(callback) {
        this.callbacks.onReady = callback;
    }

    onEvaluation(callback) {
        this.callbacks.onEvaluation = callback;
    }

    onBestMove(callback) {
        this.callbacks.onBestMove = callback;
    }

    onError(callback) {
        this.callbacks.onError = callback;
    }
}

// Global instance
window.stockfishEngine = null;

// Initialize Stockfish engine when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already created
    if (!window.stockfishEngine) {
        window.stockfishEngine = new StockfishEngine();
        
        window.stockfishEngine.onReady(() => {
            const engineType = window.stockfishEngine.isLocalEngine ? 'Local Chess Engine' : 'Stockfish Engine';
            console.log(`${engineType} ready - Enhanced AI analysis available`);
            // Update status indicator
            setTimeout(() => {
                const statusText = document.getElementById('stockfish-status-text');
                if (statusText) {
                    statusText.textContent = window.stockfishEngine.isLocalEngine ? 'Local Engine Ready' : 'Ready';
                    statusText.style.color = window.stockfishEngine.isLocalEngine ? '#17a2b8' : '#48bb78';
                }
                // Show user notification that engine is available
                const feedbackElement = document.getElementById('tutor-feedback');
                if (feedbackElement) {
                    const engineEmoji = window.stockfishEngine.isLocalEngine ? '⚡' : '🔥';
                    feedbackElement.innerHTML = `<p style="color: #48bb78; font-weight: bold;">${engineEmoji} ${engineType} loaded! You'll now receive enhanced AI analysis.</p>`;
                }
            }, 100);
        });

        window.stockfishEngine.onError((error) => {
            console.warn('Stockfish engine unavailable, using basic analysis:', error);
            // Update status indicator
            setTimeout(() => {
                const statusText = document.getElementById('stockfish-status-text');
                if (statusText) {
                    statusText.textContent = 'Unavailable';
                    statusText.style.color = '#f59e0b';
                }
                // Graceful fallback - don't show error to user, just use basic analysis
                const feedbackElement = document.getElementById('tutor-feedback');
                if (feedbackElement) {
                    feedbackElement.innerHTML = '<p>Welcome! Basic AI analysis is available. Make your first move to begin receiving guidance.</p>';
                }
            }, 100);
        });
    }
});