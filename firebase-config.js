// Firebase configuration
// To use this app, you'll need to create a Firebase project and add your config here
// Visit: https://console.firebase.google.com/

window.firebaseConfig = {
    apiKey: "AIzaSyATmEtj7FN9KnxVcD3q9tTojTpBAC7wHnI",
    authDomain: "ai-chess-te.firebaseapp.com",
    projectId: "ai-chess-te",
    storageBucket: "ai-chess-te.firebasestorage.app",
    messagingSenderId: "981859648596",
    appId: "1:981859648596:web:83b0f24380ab0b441459c1"
};

// For development/testing, you can use Firebase Emulators
// Uncomment the lines below to use local emulators instead of production Firebase
/*
window.useEmulators = true;
window.emulatorConfig = {
    auth: { host: 'localhost', port: 9099 },
    firestore: { host: 'localhost', port: 8080 }
};
*/

// Check if Firebase config is properly set up
window.isFirebaseConfigured = function() {
    return window.firebaseConfig && 
           window.firebaseConfig.apiKey !== "your-api-key-here" &&
           window.firebaseConfig.projectId !== "your-project-id";
};