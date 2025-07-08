const state = {
    currentUser: null,
    theme: 'light',
    notifications: [],
    swaps: [],
    users: [],
    chats: new Map(),
};

const subscribers = new Set();

export function getState() {
    return state;
}

export function updateState(newState) {
    Object.assign(state, newState);
    notifyStateChange();
    saveState();
}

export function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifyStateChange() {
    for (const callback of subscribers) {
        callback(state);
    }
}

function saveState() {
    try {
        const stateToSave = { ...state, chats: Array.from(state.chats.entries()) };
        localStorage.setItem('skillSwapState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Could not save state to localStorage:", error);
    }
}

export function loadState() {
    try {
        const savedState = localStorage.getItem('skillSwapState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            // Safely handle chats property
            if (parsedState.chats && Array.isArray(parsedState.chats)) {
                parsedState.chats = new Map(parsedState.chats);
            } else {
                parsedState.chats = new Map();
            }
            Object.assign(state, parsedState);
        }
    } catch (error) {
        console.error("Could not load state from localStorage:", error);
        // If loading fails, start with a clean state
        Object.assign(state, {
            currentUser: null,
            theme: 'light',
            notifications: [],
            swaps: [],
            users: [],
            chats: new Map(),
        });
    }
    notifyStateChange();
} 