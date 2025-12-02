---
description: How to deploy the Relovetree application to Firebase Hosting
---

# Deploying Relovetree to Firebase Hosting

This workflow guides you through the process of deploying the Relovetree application to Firebase Hosting. Firebase Hosting provides fast, secure, and reliable hosting for your web app, and it solves local development issues like CORS errors with YouTube videos.

## Prerequisites

1.  **Node.js and npm**: Ensure you have Node.js installed.
2.  **Firebase CLI**: Install the Firebase CLI globally if you haven't already:
    ```bash
    npm install -g firebase-tools
    ```
3.  **Firebase Project**: You should have a Firebase project created (which you already do: `relovetree`).

## Deployment Steps

1.  **Login to Firebase**:
    Open your terminal and run:
    ```bash
    firebase login
    ```
    Follow the browser instructions to log in with your Google account.

2.  **Initialize Firebase (if not already done)**:
    Run the following command in your project root:
    ```bash
    firebase init hosting
    ```
    *   **Select Project**: Choose "Use an existing project" and select `relovetree`.
    *   **Public Directory**: Type `.` (current directory) or if you have a build process, the output folder (e.g., `dist`). Since this is a vanilla JS project, `.` is fine, BUT be careful not to overwrite `index.html` if it asks.
    *   **Configure as SPA**: Type `No` (since we have multiple HTML files like `editor.html`).
    *   **Automatic Builds**: Type `No`.
    *   **Overwrite index.html?**: Type `No` (Crucial!).

3.  **Deploy**:
    Once initialized, deploy your app with:
    ```bash
    firebase deploy
    ```

4.  **Access your App**:
    After deployment, the CLI will provide a Hosting URL (e.g., `https://relovetree.web.app`). Open this URL to see your live application.

## Benefits of Firebase Hosting

*   **HTTPS**: Automatically provides SSL, which is required for many modern web APIs.
*   **YouTube Integration**: Resolves CORS and iframe policy issues often encountered when opening files locally (`file://`).
*   **Performance**: Uses a global CDN to serve your content fast.
