/**
 * Utility classes for error handling, validation, and performance optimization
 */

/**
 * Centralized error handling utility
 */
class ErrorHandler {
    static handleError(error, context = 'Unknown', options = {}) {
        const { notify = true, logLevel = 'error' } = options;
        
        const errorInfo = {
            message: error.message || 'Unknown error',
            context,
            timestamp: new Date().toISOString(),
            stack: error.stack,
            userAgent: navigator.userAgent
        };
        
        // Log error
        console[logLevel](`Error in ${context}:`, errorInfo);
        
        // Notify user if requested
        if (notify) {
            this.notifyUser(this.getUserFriendlyMessage(error, context));
        }
        
        // Could send to monitoring service here
        return errorInfo;
    }
    
    static getUserFriendlyMessage(error, context) {
        const friendlyMessages = {
            'Stockfish engine': 'Chess engine is temporarily unavailable. Using basic analysis.',
            'API request': 'Network connection issue. Please check your internet connection.',
            'Storage': 'Unable to save data. Please check browser storage permissions.',
            'Authentication': 'Login failed. Please check your credentials.',
            'Game logic': 'Invalid move detected. Please try again.'
        };
        
        return friendlyMessages[context] || 'Something went wrong. Please try again.';
    }
    
    static notifyUser(message, type = 'error') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-error);
            color: var(--color-error-foreground);
            padding: var(--space-3) var(--space-4);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            max-width: 400px;
            animation: var(--animation-slide-up);
        `;
        
        if (type === 'success') {
            notification.style.background = 'var(--color-success)';
            notification.style.color = 'var(--color-success-foreground)';
        } else if (type === 'warning') {
            notification.style.background = 'var(--color-warning)';
            notification.style.color = 'var(--color-warning-foreground)';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 300ms ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

/**
 * Input validation utility
 */
class Validator {
    static validateMove(move) {
        if (!move || typeof move !== 'object') {
            throw new Error('Invalid move object');
        }
        
        if (!Array.isArray(move.from) || move.from.length !== 2) {
            throw new Error('Invalid move.from format');
        }
        
        if (!Array.isArray(move.to) || move.to.length !== 2) {
            throw new Error('Invalid move.to format');
        }
        
        const [fromRow, fromCol] = move.from;
        const [toRow, toCol] = move.to;
        
        if (!this.isValidPosition(fromRow, fromCol)) {
            throw new Error('Invalid from position');
        }
        
        if (!this.isValidPosition(toRow, toCol)) {
            throw new Error('Invalid to position');
        }
        
        if (!move.piece || typeof move.piece !== 'object') {
            throw new Error('Invalid piece object');
        }
        
        return true;
    }
    
    static isValidPosition(row, col) {
        return Number.isInteger(row) && Number.isInteger(col) && 
               row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    static validateFEN(fen) {
        if (typeof fen !== 'string') {
            throw new Error('FEN must be a string');
        }
        
        const parts = fen.split(' ');
        if (parts.length !== 6) {
            throw new Error('FEN must have 6 parts');
        }
        
        const [board, activeColor, castling, enPassant, halfmove, fullmove] = parts;
        
        // Validate board part
        const ranks = board.split('/');
        if (ranks.length !== 8) {
            throw new Error('FEN board must have 8 ranks');
        }
        
        // Validate active color
        if (!['w', 'b'].includes(activeColor)) {
            throw new Error('Invalid active color in FEN');
        }
        
        return true;
    }
    
    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
}

/**
 * Performance optimization utility
 */
class PerformanceOptimizer {
    constructor() {
        this.domCache = new Map();
        this.debounceTimers = new Map();
        this.memoCache = new Map();
    }
    
    getElement(id) {
        if (!this.domCache.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                this.domCache.set(id, element);
            }
        }
        return this.domCache.get(id);
    }
    
    clearDOMCache() {
        this.domCache.clear();
    }
    
    debounce(key, func, delay = 300) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }
    
    throttle(key, func, delay = 100) {
        if (!this.debounceTimers.has(key)) {
            func();
            this.debounceTimers.set(key, setTimeout(() => {
                this.debounceTimers.delete(key);
            }, delay));
        }
    }
    
    memoize(key, computeFn, ttl = 60000) {
        const cached = this.memoCache.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.value;
        }
        
        const value = computeFn();
        this.memoCache.set(key, {
            value,
            timestamp: Date.now()
        });
        
        return value;
    }
    
    clearMemoCache() {
        this.memoCache.clear();
    }
}

/**
 * Safe DOM manipulation utility
 */
class DOMHelper {
    static createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });
        
        if (content) {
            if (typeof content === 'string') {
                element.textContent = content;
            } else if (content instanceof Node) {
                element.appendChild(content);
            }
        }
        
        return element;
    }
    
    static safeSetHTML(element, html) {
        // Basic XSS prevention
        const sanitized = Validator.sanitizeHTML(html);
        element.innerHTML = sanitized;
    }
    
    static toggleClass(element, className, condition) {
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
    
    static addEventListeners(element, events) {
        Object.entries(events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });
        
        // Return cleanup function
        return () => {
            Object.entries(events).forEach(([event, handler]) => {
                element.removeEventListener(event, handler);
            });
        };
    }
}

/**
 * Local storage utility with error handling
 */
class StorageHelper {
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            ErrorHandler.handleError(error, 'Storage', { notify: false });
            return defaultValue;
        }
    }
    
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            ErrorHandler.handleError(error, 'Storage');
            return false;
        }
    }
    
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            ErrorHandler.handleError(error, 'Storage', { notify: false });
            return false;
        }
    }
    
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            ErrorHandler.handleError(error, 'Storage');
            return false;
        }
    }
}

/**
 * Async utilities
 */
class AsyncHelper {
    static async withTimeout(promise, timeout = 5000) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), timeout);
        });
        
        return Promise.race([promise, timeoutPromise]);
    }
    
    static async retry(fn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries - 1) throw error;
                await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
            }
        }
    }
    
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global instances
window.errorHandler = ErrorHandler;
window.validator = Validator;
window.performanceOptimizer = new PerformanceOptimizer();
window.domHelper = DOMHelper;
window.storageHelper = StorageHelper;
window.asyncHelper = AsyncHelper;