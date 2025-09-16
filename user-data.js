class UserDataService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.init();
    }

    init() {
        this.setupNetworkListeners();
        
        // Listen for auth state changes
        if (window.authManager) {
            window.authManager.onAuthStateChange((user, isGuest) => {
                this.handleAuthStateChange(user, isGuest);
            });
        }
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored - syncing data...');
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost - data will be synced when connection is restored');
        });
    }

    handleAuthStateChange(user, isGuest) {
        if (!isGuest && user && user.uid) {
            // User logged in - sync local data to Firebase
            this.syncLocalDataToFirebase();
        }
    }

    // Game History Methods
    async saveGameHistory(gameHistory, userId = null) {
        const uid = userId || this.getCurrentUserId();
        
        // Always save locally first
        localStorage.setItem('chessAITutorHistory', JSON.stringify(gameHistory));
        
        // If user is authenticated and online, save to Firebase
        if (this.shouldUseFirestore() && uid !== 'guest') {
            try {
                await this.saveToFirestore(`users/${uid}/gameData`, 'history', gameHistory);
                console.log('Game history synced to Firebase');
            } catch (error) {
                console.error('Failed to sync game history to Firebase:', error);
                this.queueForSync('gameHistory', gameHistory);
            }
        }
    }

    async loadGameHistory(userId = null) {
        const uid = userId || this.getCurrentUserId();
        
        // If user is authenticated and online, try loading from Firebase first
        if (this.shouldUseFirestore() && uid !== 'guest' && this.isOnline) {
            try {
                const cloudData = await this.loadFromFirestore(`users/${uid}/gameData`, 'history');
                if (cloudData && Array.isArray(cloudData)) {
                    // Update local storage with cloud data
                    localStorage.setItem('chessAITutorHistory', JSON.stringify(cloudData));
                    return cloudData;
                }
            } catch (error) {
                console.warn('Failed to load game history from Firebase, using local data:', error);
            }
        }
        
        // Fallback to local storage
        try {
            return JSON.parse(localStorage.getItem('chessAITutorHistory')) || [];
        } catch {
            return [];
        }
    }

    // Player Patterns Methods
    async savePlayerPatterns(patterns, userId = null) {
        const uid = userId || this.getCurrentUserId();
        
        // Always save locally first
        localStorage.setItem('chessAITutorPatterns', JSON.stringify(patterns));
        
        // If user is authenticated and online, save to Firebase
        if (this.shouldUseFirestore() && uid !== 'guest') {
            try {
                await this.saveToFirestore(`users/${uid}/gameData`, 'patterns', patterns);
                console.log('Player patterns synced to Firebase');
            } catch (error) {
                console.error('Failed to sync player patterns to Firebase:', error);
                this.queueForSync('playerPatterns', patterns);
            }
        }
    }

    async loadPlayerPatterns(userId = null) {
        const uid = userId || this.getCurrentUserId();
        
        // If user is authenticated and online, try loading from Firebase first
        if (this.shouldUseFirestore() && uid !== 'guest' && this.isOnline) {
            try {
                const cloudData = await this.loadFromFirestore(`users/${uid}/gameData`, 'patterns');
                if (cloudData && typeof cloudData === 'object') {
                    // Update local storage with cloud data
                    localStorage.setItem('chessAITutorPatterns', JSON.stringify(cloudData));
                    return cloudData;
                }
            } catch (error) {
                console.warn('Failed to load player patterns from Firebase, using local data:', error);
            }
        }
        
        // Fallback to local storage
        try {
            return JSON.parse(localStorage.getItem('chessAITutorPatterns')) || {};
        } catch {
            return {};
        }
    }

    // User Profile Methods
    async saveUserProfile(profile, userId = null) {
        const uid = userId || this.getCurrentUserId();
        
        // Always save locally first
        localStorage.setItem('chess_user_profile', JSON.stringify(profile));
        
        // If user is authenticated and online, save to Firebase
        if (this.shouldUseFirestore() && uid !== 'guest') {
            try {
                await this.saveToFirestore(`users/${uid}`, 'profile', profile);
                console.log('User profile synced to Firebase');
            } catch (error) {
                console.error('Failed to sync user profile to Firebase:', error);
                this.queueForSync('userProfile', profile);
            }
        }
    }

    async loadUserProfile(userId = null) {
        const uid = userId || this.getCurrentUserId();
        
        // If user is authenticated and online, try loading from Firebase first
        if (this.shouldUseFirestore() && uid !== 'guest' && this.isOnline) {
            try {
                const cloudData = await this.loadFromFirestore(`users/${uid}`, 'profile');
                if (cloudData) {
                    // Update local storage with cloud data
                    localStorage.setItem('chess_user_profile', JSON.stringify(cloudData));
                    return cloudData;
                }
            } catch (error) {
                console.warn('Failed to load user profile from Firebase, using local data:', error);
            }
        }
        
        // Fallback to local storage
        try {
            return JSON.parse(localStorage.getItem('chess_user_profile')) || null;
        } catch {
            return null;
        }
    }

    // Firebase Firestore Methods
    async saveToFirestore(docPath, field, data) {
        if (!window.firestore) {
            throw new Error('Firestore not initialized');
        }

        const firestoreFunctions = await this.loadFirestoreFunctions();
        const docRef = firestoreFunctions.doc(window.firestore, docPath);
        
        await firestoreFunctions.setDoc(docRef, {
            [field]: data,
            lastUpdated: new Date(),
            version: 1
        }, { merge: true });
    }

    async loadFromFirestore(docPath, field) {
        if (!window.firestore) {
            throw new Error('Firestore not initialized');
        }

        const firestoreFunctions = await this.loadFirestoreFunctions();
        const docRef = firestoreFunctions.doc(window.firestore, docPath);
        const docSnap = await firestoreFunctions.getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data[field];
        }
        
        return null;
    }

    async loadFirestoreFunctions() {
        if (window.firestoreFunctions) {
            return window.firestoreFunctions;
        }

        // Dynamically import Firestore functions
        const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        window.firestoreFunctions = firestoreModule;
        return firestoreModule;
    }

    // Sync Methods
    async syncLocalDataToFirebase() {
        if (!this.shouldUseFirestore() || !this.isOnline) {
            return;
        }

        const uid = this.getCurrentUserId();
        if (uid === 'guest') {
            return;
        }

        try {
            console.log('Syncing local data to Firebase...');
            
            // Sync game history
            const localHistory = JSON.parse(localStorage.getItem('chessAITutorHistory') || '[]');
            if (localHistory.length > 0) {
                await this.saveToFirestore(`users/${uid}/gameData`, 'history', localHistory);
            }

            // Sync player patterns
            const localPatterns = JSON.parse(localStorage.getItem('chessAITutorPatterns') || '{}');
            if (Object.keys(localPatterns).length > 0) {
                await this.saveToFirestore(`users/${uid}/gameData`, 'patterns', localPatterns);
            }

            // Sync user profile
            const localProfile = JSON.parse(localStorage.getItem('chess_user_profile') || 'null');
            if (localProfile) {
                await this.saveToFirestore(`users/${uid}`, 'profile', localProfile);
            }

            console.log('Local data synced to Firebase successfully');
            
        } catch (error) {
            console.error('Failed to sync local data to Firebase:', error);
        }
    }

    async syncFirebaseDataToLocal() {
        if (!this.shouldUseFirestore() || !this.isOnline) {
            return;
        }

        const uid = this.getCurrentUserId();
        if (uid === 'guest') {
            return;
        }

        try {
            console.log('Syncing Firebase data to local...');
            
            // Sync game history
            const cloudHistory = await this.loadFromFirestore(`users/${uid}/gameData`, 'history');
            if (cloudHistory) {
                localStorage.setItem('chessAITutorHistory', JSON.stringify(cloudHistory));
            }

            // Sync player patterns
            const cloudPatterns = await this.loadFromFirestore(`users/${uid}/gameData`, 'patterns');
            if (cloudPatterns) {
                localStorage.setItem('chessAITutorPatterns', JSON.stringify(cloudPatterns));
            }

            // Sync user profile
            const cloudProfile = await this.loadFromFirestore(`users/${uid}`, 'profile');
            if (cloudProfile) {
                localStorage.setItem('chess_user_profile', JSON.stringify(cloudProfile));
            }

            console.log('Firebase data synced to local successfully');
            
        } catch (error) {
            console.error('Failed to sync Firebase data to local:', error);
        }
    }

    // Queue Methods for Offline Support
    queueForSync(dataType, data) {
        this.syncQueue.push({
            dataType,
            data,
            timestamp: Date.now()
        });
        
        // Limit queue size
        if (this.syncQueue.length > 100) {
            this.syncQueue = this.syncQueue.slice(-50); // Keep last 50 items
        }
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        const queue = [...this.syncQueue];
        this.syncQueue = [];
        
        for (const item of queue) {
            try {
                const uid = this.getCurrentUserId();
                if (uid === 'guest') continue;

                switch (item.dataType) {
                    case 'gameHistory':
                        await this.saveToFirestore(`users/${uid}/gameData`, 'history', item.data);
                        break;
                    case 'playerPatterns':
                        await this.saveToFirestore(`users/${uid}/gameData`, 'patterns', item.data);
                        break;
                    case 'userProfile':
                        await this.saveToFirestore(`users/${uid}`, 'profile', item.data);
                        break;
                }
                
                console.log(`Queued ${item.dataType} synced successfully`);
                
            } catch (error) {
                console.error(`Failed to sync queued ${item.dataType}:`, error);
                // Re-queue failed items (with retry limit)
                if (this.retryAttempts < this.maxRetryAttempts) {
                    this.syncQueue.push(item);
                }
            }
        }

        if (this.syncQueue.length > 0 && this.retryAttempts < this.maxRetryAttempts) {
            this.retryAttempts++;
            setTimeout(() => this.processSyncQueue(), 5000); // Retry after 5 seconds
        } else {
            this.retryAttempts = 0;
        }
    }

    // Utility Methods
    getCurrentUserId() {
        return window.authManager ? window.authManager.getUserId() : 'guest';
    }

    shouldUseFirestore() {
        return window.isFirebaseConfigured && window.isFirebaseConfigured() && window.firestore;
    }

    isUserAuthenticated() {
        return window.authManager ? window.authManager.isAuthenticated() : false;
    }

    // Export/Import Methods (enhanced)
    async exportUserData() {
        const uid = this.getCurrentUserId();
        const exportData = {
            exportDate: new Date().toISOString(),
            userId: uid,
            gameHistory: await this.loadGameHistory(),
            playerPatterns: await this.loadPlayerPatterns(),
            userProfile: await this.loadUserProfile()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `chess-data-${uid}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    async importUserData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (data.gameHistory) {
                await this.saveGameHistory(data.gameHistory);
            }
            
            if (data.playerPatterns) {
                await this.savePlayerPatterns(data.playerPatterns);
            }
            
            if (data.userProfile) {
                await this.saveUserProfile(data.userProfile);
            }

            return true;
        } catch (error) {
            console.error('Failed to import user data:', error);
            return false;
        }
    }

    // Statistics Methods
    async getUserStatistics() {
        const gameHistory = await this.loadGameHistory();
        const patterns = await this.loadPlayerPatterns();
        
        return {
            totalGames: gameHistory.length,
            averageMovesPerGame: gameHistory.length > 0 
                ? gameHistory.reduce((sum, game) => sum + game.moves.length, 0) / gameHistory.length 
                : 0,
            playingStyle: this.determinePlayingStyle(patterns),
            strengths: this.extractStrengths(patterns),
            weaknesses: this.extractWeaknesses(patterns),
            lastGameDate: gameHistory.length > 0 
                ? new Date(gameHistory[gameHistory.length - 1].date)
                : null
        };
    }

    determinePlayingStyle(patterns) {
        if (!patterns.openingMoves) return 'developing';
        
        const openingCount = Object.keys(patterns.openingMoves).length;
        const tacticalAwareness = patterns.tacticalAwareness || 0;
        
        if (tacticalAwareness > 10) return 'tactical';
        if (openingCount > 15) return 'positional';
        if (openingCount > 8) return 'balanced';
        return 'developing';
    }

    extractStrengths(patterns) {
        const strengths = [];
        
        if (patterns.tacticalAwareness > 5) {
            strengths.push('Good tactical awareness');
        }
        
        if (patterns.openingMoves && Object.keys(patterns.openingMoves).length > 10) {
            strengths.push('Diverse opening repertoire');
        }
        
        return strengths;
    }

    extractWeaknesses(patterns) {
        const weaknesses = [];
        
        if (patterns.commonMistakes) {
            const topMistake = Object.entries(patterns.commonMistakes)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (topMistake && topMistake[1] > 3) {
                weaknesses.push(`Tendency for ${topMistake[0].replace(/_/g, ' ')}`);
            }
        }
        
        return weaknesses;
    }
}

// Initialize user data service
document.addEventListener('DOMContentLoaded', () => {
    window.userDataService = new UserDataService();
});