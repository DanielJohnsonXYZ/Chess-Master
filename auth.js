class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isGuest = true;
        this.authStateListeners = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
        
        // Show user menu in header
        document.getElementById('user-menu').style.display = 'block';
    }

    setupEventListeners() {
        // Login button in header
        document.getElementById('login-btn').addEventListener('click', () => {
            this.showLoginModal();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Auth modal events
        document.getElementById('close-login-modal').addEventListener('click', () => {
            this.hideLoginModal();
        });

        // Auth tabs
        document.getElementById('login-tab').addEventListener('click', () => {
            this.switchToLogin();
        });

        document.getElementById('signup-tab').addEventListener('click', () => {
            this.switchToSignup();
        });

        // Continue as guest
        document.getElementById('continue-guest').addEventListener('click', () => {
            this.continueAsGuest();
        });

        // Auth form submission
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuthSubmit();
        });

        // Close modal when clicking outside
        document.getElementById('login-modal').addEventListener('click', (e) => {
            if (e.target.id === 'login-modal') {
                this.hideLoginModal();
            }
        });

        // Firebase auth state listener
        if (window.firebaseAuth && window.isFirebaseConfigured()) {
            const { onAuthStateChanged } = window.firebaseAuthFunctions || {};
            if (onAuthStateChanged) {
                onAuthStateChanged(window.firebaseAuth, (user) => {
                    this.handleAuthStateChange(user);
                });
            }
        }
    }

    checkAuthState() {
        if (!window.isFirebaseConfigured()) {
            console.log('Firebase not configured - using guest mode only');
            this.handleGuestMode();
            return;
        }

        // Check if user was previously logged in
        const savedUser = localStorage.getItem('chess_user_profile');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (user && !user.isGuest) {
                    // Wait for Firebase to initialize and check actual auth state
                    setTimeout(() => {
                        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                            this.handleAuthStateChange(window.firebaseAuth.currentUser);
                        } else {
                            // User was logged out elsewhere
                            this.logout();
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error('Error parsing saved user:', error);
            }
        } else {
            // First time user - show login modal after a delay
            setTimeout(() => {
                if (this.isGuest) {
                    this.showLoginModal();
                }
            }, 2000);
        }
    }

    handleGuestMode() {
        this.isGuest = true;
        this.currentUser = {
            uid: 'guest',
            email: 'Guest User',
            displayName: 'Guest',
            isGuest: true
        };
        this.updateUI();
        this.notifyAuthStateChange();
    }

    async handleAuthSubmit() {
        if (!window.isFirebaseConfigured()) {
            this.showError('Firebase is not configured. Please contact the administrator.');
            return;
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value?.trim();
        const isSignup = document.getElementById('signup-tab').classList.contains('active');

        if (!email || !password) {
            this.showError('Please enter both email and password.');
            return;
        }

        if (isSignup && !name) {
            this.showError('Please enter your full name.');
            return;
        }

        try {
            this.setLoading(true);
            this.hideError();

            const authFunctions = await this.loadFirebaseAuth();
            
            let userCredential;
            if (isSignup) {
                userCredential = await authFunctions.createUserWithEmailAndPassword(
                    window.firebaseAuth, 
                    email, 
                    password
                );
                
                // Update user profile with name
                await authFunctions.updateProfile(userCredential.user, {
                    displayName: name
                });
            } else {
                userCredential = await authFunctions.signInWithEmailAndPassword(
                    window.firebaseAuth, 
                    email, 
                    password
                );
            }

            // Success - modal will be closed by auth state change handler
            console.log('Authentication successful');

        } catch (error) {
            console.error('Authentication error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setLoading(false);
        }
    }

    async loadFirebaseAuth() {
        if (window.firebaseAuthFunctions) {
            return window.firebaseAuthFunctions;
        }

        // Dynamically import Firebase auth functions
        const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        window.firebaseAuthFunctions = authModule;
        return authModule;
    }

    handleAuthStateChange(user) {
        if (user) {
            // User is signed in
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email,
                isGuest: false,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };
            this.isGuest = false;
            
            // Save user info
            localStorage.setItem('chess_user_profile', JSON.stringify(this.currentUser));
            
            this.updateUI();
            this.hideLoginModal();
            this.notifyAuthStateChange();
            
            // Sync local data to Firebase
            if (window.userDataService) {
                window.userDataService.syncLocalDataToFirebase();
            }
            
        } else {
            // User is signed out
            this.logout();
        }
    }

    async logout() {
        try {
            if (window.firebaseAuth && !this.isGuest) {
                const authFunctions = await this.loadFirebaseAuth();
                await authFunctions.signOut(window.firebaseAuth);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.handleGuestMode();
            localStorage.removeItem('chess_user_profile');
        }
    }

    continueAsGuest() {
        this.handleGuestMode();
        this.hideLoginModal();
        
        // Save guest preference
        localStorage.setItem('chess_user_profile', JSON.stringify(this.currentUser));
    }

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const userEmail = document.getElementById('user-email');

        if (this.isGuest) {
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        } else {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = this.currentUser.displayName || this.currentUser.email;
        }
    }

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Clear form
        document.getElementById('auth-form').reset();
        this.hideError();
        
        // Default to login tab
        this.switchToLogin();
    }

    hideLoginModal() {
        const modal = document.getElementById('login-modal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    switchToLogin() {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('signup-tab').classList.remove('active');
        document.getElementById('signup-name').style.display = 'none';
        document.getElementById('auth-submit').textContent = 'Login';
        document.getElementById('name').required = false;
        this.hideError();
    }

    switchToSignup() {
        document.getElementById('signup-tab').classList.add('active');
        document.getElementById('login-tab').classList.remove('active');
        document.getElementById('signup-name').style.display = 'block';
        document.getElementById('auth-submit').textContent = 'Sign Up';
        document.getElementById('name').required = true;
        this.hideError();
    }

    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideError() {
        document.getElementById('auth-error').style.display = 'none';
    }

    setLoading(loading) {
        const submitBtn = document.getElementById('auth-submit');
        const form = document.getElementById('auth-form');
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Loading...';
            form.style.opacity = '0.7';
        } else {
            submitBtn.disabled = false;
            const isSignup = document.getElementById('signup-tab').classList.contains('active');
            submitBtn.textContent = isSignup ? 'Sign Up' : 'Login';
            form.style.opacity = '1';
        }
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters long.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection.';
            default:
                return error.message || 'An error occurred during authentication.';
        }
    }

    // Auth state listeners for other components
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
    }

    notifyAuthStateChange() {
        this.authStateListeners.forEach(callback => {
            try {
                callback(this.currentUser, this.isGuest);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }

    // Utility methods
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !this.isGuest && this.currentUser && this.currentUser.uid;
    }

    getUserId() {
        return this.currentUser?.uid || 'guest';
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});