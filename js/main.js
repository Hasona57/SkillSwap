import { loadState, getState } from './state.js';
import { initAuth } from './auth.js';
import { initUI } from './ui.js';
import { initTheme } from './theme.js';
import { updateUserLastSeen } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Show a loading indicator
    const initialLoader = document.querySelector('.initial-loader');
    if (initialLoader) {
        initialLoader.style.display = 'flex';
    }
    
    try {
        loadState();
        // Initialize all modules
        initAuth();
        initUI();
        initTheme();

        // Periodically update the user's lastSeen timestamp to indicate they're online
        setInterval(() => {
            const currentUser = getState().currentUser;
            if (currentUser) {
                updateUserLastSeen(currentUser.id);
            }
        }, 20 * 1000); // every 20 seconds

        console.log("SkillSwap App Initialized Successfully");

    } catch (error) {
        console.error("Failed to initialize the application:", error);
        // Optionally, show an error message to the user
        document.body.innerHTML = '<p style="text-align: center; margin-top: 50px;">Sorry, the application could not be loaded. Please try again later.</p>';
    } finally {
        // Hide the loading indicator
        if (initialLoader) {
            initialLoader.style.display = 'none';
        }
    }
}); 