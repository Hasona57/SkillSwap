import { initAuth } from './auth.js';
import { initTheme } from './theme.js';
import { initUI } from './ui.js';
import { updateUserLastSeen } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const initialLoader = document.querySelector('.initial-loader');
    if (initialLoader) {
        // Hide loader after a delay to simulate loading
        setTimeout(() => {
            initialLoader.style.display = 'none';
        }, 1500);
    }
    
    // Initialize all modules
    initAuth();
    initUI();
    initTheme();

    // Periodically update the user's lastSeen timestamp to indicate they're online
    setInterval(updateUserLastSeen, 60 * 1000); // every minute

    console.log('SkillSwap App Initialized Successfully');
}); 