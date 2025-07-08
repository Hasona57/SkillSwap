import { updateState, getState } from './state.js';

const MOCK_API_LATENCY = 500;

// Helper to simulate API calls
function simulateApiCall(callback) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const result = callback();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }, MOCK_API_LATENCY);
    });
}

// --- User API ---

export async function login(email, password) {
    return simulateApiCall(() => {
        const { users } = getState();
        const user = users.find(u => u.email === email);
        if (user && user.password === password) { // In a real app, passwords would be hashed
            updateState({ currentUser: user });
            return user;
        }
        throw new Error("Invalid email or password.");
    });
}

export async function signup(name, email, password) {
    return simulateApiCall(() => {
        const { users } = getState();
        if (users.some(u => u.email === email)) {
            throw new Error("User with this email already exists.");
        }
        const newUser = {
            id: `user_${Date.now()}`,
            name,
            email,
            password, // In a real app, hash this password
            lastSeen: new Date().toISOString(),
        };
        const updatedUsers = [...users, newUser];
        updateState({ users: updatedUsers, currentUser: newUser });
        return newUser;
    });
}

export async function logout() {
    return simulateApiCall(() => {
        updateState({ currentUser: null });
    });
}

export function getCurrentUser() {
    return getState().currentUser;
}

export async function getUserById(userId) {
    return simulateApiCall(() => {
        const { users } = getState();
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error("User not found");
        return user;
    });
}

export async function updateUserLastSeen(userId) {
    return simulateApiCall(() => {
        const { users } = getState();
        const updatedUsers = users.map(u => 
            u.id === userId ? { ...u, lastSeen: new Date().toISOString() } : u
        );
        updateState({ users: updatedUsers });
    });
}

export async function setUserTypingStatus(userId, chatId) {
    return simulateApiCall(() => {
        const { users } = getState();
        const updatedUsers = users.map(u => 
            u.id === userId ? { ...u, typingInChat: chatId } : u
        );
        updateState({ users: updatedUsers });
    });
}

// --- Swaps API ---

export async function getSwaps() {
    return simulateApiCall(() => getState().swaps);
}

export async function addSwap(swapData) {
    return simulateApiCall(() => {
        const { swaps, currentUser } = getState();
        const newSwap = {
            ...swapData,
            id: `swap_${Date.now()}`,
            userId: currentUser.id,
            createdAt: new Date().toISOString(),
            archived: false
        };
        updateState({ swaps: [...swaps, newSwap] });
        return newSwap;
    });
}

export async function updateSwap(swapId, updatedData) {
    return simulateApiCall(() => {
        const { swaps } = getState();
        const updatedSwaps = swaps.map(swap => 
            swap.id === swapId ? { ...swap, ...updatedData } : swap
        );
        updateState({ swaps: updatedSwaps });
        return updatedSwaps.find(s => s.id === swapId);
    });
}

export async function deleteSwap(swapId) {
    return simulateApiCall(() => {
        let { swaps } = getState();
        const initialLength = swaps.length;
        swaps = swaps.filter(swap => swap.id !== swapId);
        if (swaps.length === initialLength) {
            throw new Error("Swap not found to delete.");
        }
        updateState({ swaps });
        return { success: true };
    });
}

// --- Chat API ---

export async function getChatsForUser(userId) {
    return simulateApiCall(() => {
        const { chats } = getState();
        const userChats = [];
        for (const [chatId, chatData] of chats.entries()) {
            if (chatData.participants.includes(userId)) {
                userChats.push({ id: chatId, ...chatData });
            }
        }
        return userChats;
    });
}

export async function getChat(chatId) {
    return simulateApiCall(() => {
        const chat = getState().chats.get(chatId);
        if (!chat) throw new Error("Chat not found");
        return { id: chatId, ...chat };
    });
}

export async function sendMessage(chatId, text, type = 'text') {
    return simulateApiCall(() => {
        const { chats, currentUser } = getState();
        const chat = chats.get(chatId);

        if (!chat) throw new Error("Chat not found");

        const message = {
            id: `msg_${Date.now()}`,
            senderId: currentUser.id,
            text,
            type, // 'text' or 'image'
            timestamp: new Date().toISOString(),
            status: 'sent' // sent, delivered, seen
        };
        
        const updatedChat = { ...chat, messages: [...chat.messages, message] };
        const updatedChats = new Map(chats);
        updatedChats.set(chatId, updatedChat);
        
        updateState({ chats: updatedChats });
        return message;
    });
}

export async function updateMessageStatus(chatId, messageIds, newStatus) {
    return simulateApiCall(() => {
        const { chats } = getState();
        const chat = chats.get(chatId);
        if (!chat) return;

        const updatedMessages = chat.messages.map(msg => {
            if (messageIds.includes(msg.id) && msg.status !== 'seen') {
                return { ...msg, status: newStatus };
            }
            return msg;
        });

        const updatedChat = { ...chat, messages: updatedMessages };
        const updatedChats = new Map(chats);
        updatedChats.set(chatId, updatedChat);
        updateState({ chats: updatedChats });
    });
}

export async function startChat(swapId, initialMessage) {
    return simulateApiCall(() => {
        const { swaps, currentUser, chats } = getState();
        const swap = swaps.find(s => s.id === swapId);
        if (!swap) throw new Error("Swap not found");

        // Check if a chat already exists for this swap and user
        for (const [id, chat] of chats.entries()) {
            if (chat.swapId === swapId && chat.participants.includes(currentUser.id)) {
                return { id, ...chat }; // Return existing chat
            }
        }

        // Create a new chat
        const chatId = `chat_${Date.now()}`;
        const newChat = {
            swapId,
            participants: [currentUser.id, swap.userId],
            messages: [{
                id: `msg_${Date.now()}`,
                senderId: currentUser.id,
                text: initialMessage,
                timestamp: new Date().toISOString()
            }]
        };

        const updatedChats = new Map(chats);
        updatedChats.set(chatId, newChat);
        updateState({ chats: updatedChats });
        
        return { id: chatId, ...newChat };
    });
} 