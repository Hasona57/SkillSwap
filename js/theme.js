import { $ } from './utils.js';
import { updateState, getState } from './state.js';

let themeToggle;

export function initTheme() {
    themeToggle = $('#themeToggle');
    if (!themeToggle) return;

    bindThemeEvents();
    loadTheme();
}

function bindThemeEvents() {
    themeToggle.addEventListener('click', () => {
        const newTheme = getState().theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
}

function loadTheme() {
    const currentTheme = getState().theme || 'light';
    setTheme(currentTheme, false); // Don't save it back to state on initial load
}

function setTheme(theme, save = true) {
    document.body.classList.toggle('dark', theme === 'dark');
    
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }
    
    if (save) {
        updateState({ theme });
    }
} 