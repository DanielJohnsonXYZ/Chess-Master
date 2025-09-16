# Firebase Setup Instructions

This guide will help you set up Firebase authentication and cloud storage for your Chess AI Tutor to enable user login and cross-device game synchronization.

## Prerequisites

- A Google account
- Your Chess AI Tutor project files

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or "Add project")
3. Enter a project name (e.g., "chess-ai-tutor")
4. Disable Google Analytics (unless you want it)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project console, click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click "Email/Password"
5. Enable "Email/Password" (first toggle)
6. Click "Save"

## Step 3: Set up Firestore Database

1. In your Firebase project console, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose the one closest to your users)
5. Click "Done"

## Step 4: Configure Your Web App

1. In your Firebase project console, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon (`</>`) to add a web app
5. Enter an app nickname (e.g., "Chess AI Tutor Web")
6. Check "Also set up Firebase Hosting" (optional)
7. Click "Register app"

## Step 5: Get Your Configuration

1. Copy the Firebase configuration object shown on screen
2. Open your `firebase-config.js` file
3. Replace the placeholder values with your actual configuration:

```javascript
window.firebaseConfig = {
    apiKey: "your-actual-api-key-here",
    authDomain: "your-project.firebaseapp.com", 
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "your-actual-app-id"
};
```

## Step 6: Set Firestore Security Rules (Important!)

1. In your Firebase project console, go to "Firestore Database"
2. Click the "Rules" tab
3. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click "Publish"

## Step 7: Test Your Setup

1. Open your Chess AI Tutor in a web browser
2. You should see a "Login" button in the header
3. Click it and try creating an account
4. After signing up, play a game and check that it syncs to Firebase:
   - Go to Firebase Console > Firestore Database
   - You should see a `users` collection with your user data

## Optional: Set up Firebase Hosting

If you want to host your app on Firebase:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. In your project folder, run: `firebase init hosting`
3. Choose your Firebase project
4. Set public directory as `.` (current directory)
5. Configure as single-page app: Yes
6. Don't overwrite index.html
7. Run `firebase deploy` to deploy

## Troubleshooting

### "Firebase not configured" message
- Make sure you've updated `firebase-config.js` with your actual project values
- Check that all the values are correct (no placeholder text)

### Authentication errors
- Ensure Email/Password authentication is enabled in Firebase Console
- Check browser console for detailed error messages

### Firestore permission errors  
- Verify your Firestore security rules allow authenticated users to read/write their own data
- Make sure you're logged in when trying to save data

### Data not syncing
- Check your internet connection
- Open browser dev tools and check for errors in the Console tab
- Verify Firestore rules allow the authenticated user to write data

## Cost Information

Firebase offers a generous free tier:
- **Authentication**: 10K verifications/month free
- **Firestore**: 50K reads, 20K writes, 20K deletes per day free
- **Hosting**: 10GB storage, 360MB/day transfer free

For a chess tutor app with moderate usage, you'll likely stay within the free tier.

## Security Best Practices

1. Never commit your `firebase-config.js` with real values to a public repository
2. Use Firestore security rules to protect user data
3. Consider enabling reCAPTCHA for authentication in production
4. Regularly review your Firebase usage and security settings

Your Chess AI Tutor should now support user authentication and cross-device game synchronization!