import { $, $$ } from './utils.js';
import { getSwaps, getCurrentUser, getChatsForUser, getChat, sendMessage, startChat, addSwap, updateSwap, deleteSwap, getUserById, updateMessageStatus, setUserTypingStatus } from './api.js';
import { subscribe, getState } from './state.js';
import { escapeHtml, showToast } from './utils.js';
import { showAuthModal } from './auth.js';

let mainContent;
const sections = {};
const modals = {};

// State
let activeChatId = null;
let editingSwapId = null;

export function initUI() {
    mainContent = $('#mainContent');
    
    // Page sections
    sections.profile = $('#profileSection');
    sections.mySwaps = $('#mySwapsSection');
    sections.messages = $('#messagesSection');
    sections.featuredSwaps = $('#featuredSwapsSection');
    sections.hero = $('.hero-section');
    sections.howItWorks = $('.how-it-works');

    // Modals
    modals.createSwap = $('#createSwapModal');
    
    bindUIEvents();
    subscribe(renderAll); // Re-render on state change
    renderAll(); // Initial render
}

function bindUIEvents() {
    // Main navigation
    $('#profileLink')?.addEventListener('click', e => (e.preventDefault(), showSection('profile')));
    $('#mySwapsLink')?.addEventListener('click', e => (e.preventDefault(), showSection('mySwaps')));
    $('#messagesLink')?.addEventListener('click', e => (e.preventDefault(), showSection('messages')));
    $('.nav-logo').addEventListener('click', () => showSection('main'));

    // User Menu Dropdown
    const userMenu = $('#userMenu');
    userMenu?.querySelector('.user-menu-button')?.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        userMenu?.classList.remove('active');
    });


    // "My Swaps" section UI
    $('#createSwapBtn')?.addEventListener('click', () => {
        const user = getCurrentUser();
        if (user) {
            showSwapModal();
        } else {
            showToast('Please log in to create a swap.', 'info');
            // Optionally, trigger the login modal to open
            // showAuthModal('login'); // You would need to import this from auth.js
        }
    });

    // Modal close buttons
    modals.createSwap.querySelector('.close-modal').addEventListener('click', () => hideSwapModal());
    
    // Form submissions
    $('#createSwapForm').addEventListener('submit', handleSwapFormSubmit);
}

function showSection(sectionName) {
    Object.values(sections).forEach(section => {
        if (section) section.style.display = 'none';
    });

    if (sectionName === 'main') {
        sections.hero.style.display = 'block';
        sections.featuredSwaps.style.display = 'block';
        sections.howItWorks.style.display = 'block';
    } else if (sections[sectionName]) {
        sections[sectionName].style.display = 'block';
    }
    
    if (sectionName === 'messages') renderChatList();
    if (sectionName === 'mySwaps') renderMySwaps();
}

// --- Render Functions ---

function renderAll() {
    const user = getCurrentUser();
    renderAllSwaps();
    if(user) {
        renderProfile();
        renderMySwaps();
        if (sections.messages.style.display === 'block') {
            renderChatList();
            if (activeChatId) renderChatView(activeChatId);
        }
    }
}

async function renderProfile() {
    const user = getCurrentUser();
    if (!user || !sections.profile) return;

    $('#profileName').textContent = user.name;
    $('#profileEmail').textContent = user.email;

    // Fetch and count user's swaps and chats
    const allSwaps = await getSwaps();
    const userSwaps = allSwaps.filter(swap => swap.userId === user.id);
    $('#userSwapsCount').textContent = userSwaps.length;

    const userChats = await getChatsForUser(user.id);
    $('#activeChatsCount').textContent = userChats.length;
}

async function renderAllSwaps() {
    const user = getCurrentUser();
    const swapsGrid = $('#swapsGrid');
    try {
        const swaps = await getSwaps();
        if (swaps.length === 0) {
            swapsGrid.innerHTML = '<p class="empty-state">No swaps available yet. Be the first to create one!</p>';
            return;
        }
        swapsGrid.innerHTML = swaps.map(swap => createSwapCard(swap, user)).join('');
        
        // Add event listeners for contact buttons
        $$('.contact-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!user) {
                    showToast('Please log in to contact users.', 'info');
                    return;
                }
                const swapId = btn.dataset.swapId;
                const swap = swaps.find(s => s.id === swapId);
                // Prevent starting a chat with oneself
                if (user.id === swap.userId) {
                    showToast("You cannot start a chat about your own swap.", "warning");
                    return;
                }
                const initialMessage = `Hi, I'm interested in your offer to teach "${swap.teaching}"!`;
                const newChat = await startChat(swapId, initialMessage);
                activeChatId = newChat.id;
                showSection('messages');
            });
        });

    } catch(error) {
        swapsGrid.innerHTML = '<p class="empty-state">Could not load swaps.</p>';
        console.error("Failed to render swaps:", error);
    }
}

async function renderMySwaps() {
    const user = getCurrentUser();
    if (!user || !sections.mySwaps) return;
    
    const mySwapsGrid = $('#mySwapsGrid');
    try {
        const allSwaps = await getSwaps();
        const mySwaps = allSwaps.filter(swap => swap.userId === user.id);

        if (mySwaps.length === 0) {
            mySwapsGrid.innerHTML = '<p class="empty-state">You have not created any swaps yet.</p>';
            return;
        }
        mySwapsGrid.innerHTML = mySwaps.map(swap => createSwapCard(swap, user, true)).join('');
        
        // Add listeners for edit/delete
        $$('.edit-swap-btn').forEach(btn => btn.addEventListener('click', () => showSwapModal(btn.dataset.swapId)));
        $$('.delete-swap-btn').forEach(btn => btn.addEventListener('click', () => handleDeleteSwap(btn.dataset.swapId)));

    } catch(error) {
        mySwapsGrid.innerHTML = '<p class="empty-state">Could not load your swaps.</p>';
        console.error("Failed to render your swaps:", error);
    }
}

// --- Swap Card & Modal ---

function createSwapCard(swap, currentUser, isMySwap = false) {
    const { id, teaching, learning, description, tags, userId } = swap;
    let actionButton = '';

    if (isMySwap) {
        actionButton = `
            <div class="swap-actions">
                <button class="btn edit-swap-btn" data-swap-id="${id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-secondary delete-swap-btn" data-swap-id="${id}"><i class="fas fa-trash"></i> Delete</button>
            </div>`;
    } else {
        actionButton = `<button class="contact-btn" data-swap-id="${id}"><i class="fas fa-envelope"></i> Contact</button>`;
    }

    return `
        <div class="swap-card">
            <div class="swap-header">
                <h3>${escapeHtml(teaching)}</h3>
            </div>
            <div class="swap-content">
                <div class="swap-skill">
                    <i class="fas fa-book"></i>
                    <p><strong>Wants to Learn:</strong> ${escapeHtml(learning)}</p>
                </div>
                <div class="swap-desc">
                    <p>${escapeHtml(description)}</p>
                </div>
                <div class="swap-tags">
                    ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
            ${actionButton}
        </div>
    `;
}

async function showSwapModal(swapId = null) {
    editingSwapId = swapId;
    const form = $('#createSwapForm');
    form.reset();
    
    if (swapId) {
        modals.createSwap.querySelector('h2').textContent = 'Edit Swap';
        form.querySelector('.submit-btn .btn-text').textContent = 'Update Swap';
        const allSwaps = await getSwaps();
        const swapToEdit = allSwaps.find(s => s.id === swapId);
        if (swapToEdit) {
            $('#teach').value = swapToEdit.teaching;
            $('#learn').value = swapToEdit.learning;
            $('#description').value = swapToEdit.description;
            $('#tags').value = swapToEdit.tags.join(', ');
        }
    } else {
        modals.createSwap.querySelector('h2').textContent = 'Create New Swap';
        form.querySelector('.submit-btn .btn-text').textContent = 'Create Swap';
    }
    
    modals.createSwap.style.display = 'block';
}

function hideSwapModal() {
    modals.createSwap.style.display = 'none';
    editingSwapId = null;
}

async function handleSwapFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.classList.add('loading');

    const swapData = {
        teaching: $('#teach').value,
        learning: $('#learn').value,
        description: $('#description').value,
        tags: $('#tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    try {
        if (editingSwapId) {
            await updateSwap(editingSwapId, swapData);
            showToast('Swap updated successfully!', 'success');
        } else {
            await addSwap(swapData);
            showToast('Swap created successfully!', 'success');
        }
        hideSwapModal();
        renderMySwaps(); // Re-render user's swaps
        renderAllSwaps(); // Re-render all swaps
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        submitBtn.classList.remove('loading');
    }
}

async function handleDeleteSwap(swapId) {
    if (confirm('Are you sure you want to permanently delete this swap? This action cannot be undone.')) {
        try {
            await deleteSwap(swapId);
            showToast('Swap deleted successfully.', 'success');
            renderMySwaps();
            renderAllSwaps();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    }
}


// --- Chat UI ---

async function renderChatList() {
    const user = getCurrentUser();
    if (!user) return;

    const chatListEl = $('#chatList');
    try {
        const chats = await getChatsForUser(user.id);
        if (chats.length === 0) {
            chatListEl.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>No active conversations.</p></div>';
            return;
        }

        const chatItemsHtml = await Promise.all(chats.map(async chat => {
            const lastMsg = chat.messages[chat.messages.length - 1];
            const otherParticipantId = chat.participants.find(p => p !== user.id);
            let partnerName = 'Unknown User';
            if (otherParticipantId) {
                try {
                    const partner = await getUserById(otherParticipantId);
                    partnerName = partner.name;
                } catch(e) { console.error(e); }
            }

            return `
                <div class="chat-list-item ${chat.id === activeChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                    <i class="fas fa-user-circle"></i>
                    <div class="chat-list-item-info">
                      <p class="chat-partner">${escapeHtml(partnerName)}</p>
                      <p class="last-message">${escapeHtml(lastMsg.text)}</p>
                    </div>
                </div>
            `;
        }));

        chatListEl.innerHTML = chatItemsHtml.join('');

        $$('.chat-list-item').forEach(item => {
            item.addEventListener('click', () => {
                activeChatId = item.dataset.chatId;
                renderChatView(activeChatId);
                $$('.chat-list-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

    } catch (error) {
        console.error('Failed to render chat list:', error);
        chatListEl.innerHTML = '<p class="empty-state">Error loading chats.</p>';
    }
}

async function renderChatView(chatId) {
    const user = getCurrentUser();
    const chatViewEl = $('#chatView');
    const messagesListEl = chatViewEl.querySelector('#messagesList');

    try {
        const chat = await getChat(chatId);
        
        // Update chat header with partner info
        const partnerId = chat.participants.find(p => p !== user.id);
        const partner = await getUserById(partnerId);
        $('#chatPartnerName').textContent = partner.name;
        
        // Update partner status
        updatePartnerStatus(partner);

        // Mark incoming messages as 'seen'
        const unseenMessageIds = chat.messages
            .filter(msg => msg.senderId !== user.id && msg.status !== 'seen')
            .map(msg => msg.id);
        
        if (unseenMessageIds.length > 0) {
            await updateMessageStatus(chatId, unseenMessageIds, 'seen');
        }

        // Render messages
        messagesListEl.innerHTML = chat.messages.map(msg => {
            const isMe = msg.senderId === user.id;
            let messageContent = '';

            if (msg.type === 'image') {
                messageContent = `<img src="${msg.text}" alt="User image" class="chat-image">`;
            } else {
                messageContent = `<p>${escapeHtml(msg.text)}</p>`;
            }

            const statusIndicator = isMe ? `<span class="message-status">${renderStatus(msg.status)}</span>` : '';

            return `
                <div class="message ${isMe ? 'sent' : 'received'}">
                    ${messageContent}
                    <div class="message-meta">
                      <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ${statusIndicator}
                    </div>
                </div>
            `;
        }).join('');

        messagesListEl.scrollTop = messagesListEl.scrollHeight;

        // Re-bind events for the form in this specific chat view
        bindChatFormEvents(chatId, partner);

        // Add scroll listener for the "scroll to bottom" button
        const messagesList = $('#messagesList');
        const scrollToBottomBtn = $('#scrollToBottomBtn');
        messagesList.addEventListener('scroll', () => {
            const isScrolledUp = messagesList.scrollHeight - messagesList.scrollTop > messagesList.clientHeight + 200;
            scrollToBottomBtn.style.display = isScrolledUp ? 'flex' : 'none';
        });
        scrollToBottomBtn.onclick = () => {
            messagesList.scrollTop = messagesList.scrollHeight;
        };


    } catch (error) {
        console.error(`Failed to render chat ${chatId}:`, error);
        $('#chatPartnerName').textContent = 'Could not load chat.';
        messagesListEl.innerHTML = '';
    }
}

function bindChatFormEvents(chatId, partner) {
    const messageInput = $('#message-input');
    const sendBtn = $('#send-btn');
    const fileUpload = $('#file-upload');
    let typingTimeout;

    // Typing indicator logic
    messageInput.addEventListener('input', () => {
        // Notify that current user is typing
        setUserTypingStatus(getCurrentUser().id, chatId);
        
        // Clear previous timeout
        clearTimeout(typingTimeout);
        
        // Set a timeout to clear typing status
        typingTimeout = setTimeout(() => {
            setUserTypingStatus(getCurrentUser().id, null);
        }, 3000); // 3 seconds of inactivity

        // Auto-resize textarea
        messageInput.style.height = 'auto';
        messageInput.style.height = `${messageInput.scrollHeight}px`;
    });

    const sendMessageHandler = async () => {
        const text = messageInput.value.trim();
        if (text) {
            messageInput.value = '';
            messageInput.style.height = 'auto'; // Reset height
            clearTimeout(typingTimeout);
            setUserTypingStatus(getCurrentUser().id, null);
            await sendMessage(chatId, text);
            renderChatView(chatId);
        }
    };

    sendBtn.onclick = sendMessageHandler;
    messageInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageHandler();
        }
    };

    fileUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    await sendMessage(chatId, event.target.result, 'image');
                    showToast('Image sent!', 'success');
                    renderChatView(chatId);
                } catch (error) {
                    showToast('Failed to send image.', 'error');
                }
            };
            reader.readAsDataURL(file);
        } else if (file) {
            showToast('Only image files are supported for now.', 'info');
        }
        fileUpload.value = ''; // Reset file input
    };

    // Simulated call buttons
    $('#audioCallBtn').onclick = () => showCallOverlay(partner, 'audio');
    $('#videoCallBtn').onclick = () => showCallOverlay(partner, 'video');
}

function renderStatus(status) {
    if (status === 'seen') {
        return '<i class="fas fa-check-double seen"></i>';
    }
    if (status === 'sent') { // or 'delivered'
        return '<i class="fas fa-check-double"></i>';
    }
    return '';
}


function showCallOverlay(partner, callType) {
    console.log(`[Call] Attempting to start ${callType} call with:`, partner);

    const overlay = $('#callOverlay');
    const callStatusEl = $('#callStatus');
    const hangUpBtn = $('#hangUpBtn');
    let callTimeout;

    $('#callerName').textContent = partner.name;
    overlay.style.display = 'flex';

    // For demo purposes, we'll assume the partner is always online to trigger the call sequence.
    // In a real app, you would have a more robust online status check (e.g., WebSockets).
    const isOnline = true; 
    console.log(`[Call] Is partner online? ${isOnline} (simulation)`);

    if (!isOnline) {
        callStatusEl.textContent = 'User is unavailable';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 2000);
        return;
    }
    
    callStatusEl.textContent = `${callType === 'video' ? 'Video' : 'Audio'} call - Ringing...`;
    console.log('[Call] Ringing...');

    // Simulate call sequence
    callTimeout = setTimeout(() => {
        const coinToss = Math.random();
        console.log(`[Call] Coin toss for answer/reject: ${coinToss}`);
        if (coinToss > 0.3) { // 70% chance of answering
            callStatusEl.textContent = '00:01';
            console.log('[Call] Call answered.');
            // Simple timer
            let seconds = 1;
            callTimeout = setInterval(() => {
                seconds++;
                const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                const secs = (seconds % 60).toString().padStart(2, '0');
                callStatusEl.textContent = `${mins}:${secs}`;
            }, 1000);
        } else { // 30% chance of rejecting
            callStatusEl.textContent = 'Call rejected';
            console.log('[Call] Call rejected.');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 2000);
        }
    }, 4000); // Ring for 4 seconds


    hangUpBtn.onclick = () => {
        clearInterval(callTimeout);
        overlay.style.display = 'none';
        showToast('Call ended.', 'info');
        console.log('[Call] Hung up by user.');
    };
}


function updatePartnerStatus(partner) {
    const statusEl = $('#chatPartnerStatus');
    if (!partner || !partner.lastSeen) {
        statusEl.textContent = 'Offline';
        statusEl.className = 'status offline';
        return;
    }

    const lastSeenDate = new Date(partner.lastSeen);
    const now = new Date();
    const minutesAgo = (now - lastSeenDate) / (1000 * 60);

    if (minutesAgo < 5) {
        statusEl.textContent = 'Online';
        statusEl.className = 'status online';
    } else {
        statusEl.textContent = `Last seen ${formatTimeAgo(lastSeenDate)}`;
        statusEl.className = 'status offline';
    }
}

// Global interval to check for partner typing status
setInterval(() => {
    if(!activeChatId) return;

    const { users, currentUser } = getState();
    const chat = getState().chats.get(activeChatId);
    if (!chat || !currentUser) return;
    
    const partnerId = chat.participants.find(p => p !== currentUser.id);
    const partner = users.find(u => u.id === partnerId);
    const typingIndicator = $('#typingIndicator');

    if (partner && partner.typingInChat === activeChatId) {
        typingIndicator.textContent = `${partner.name} is typing...`;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }

}, 1000); // Check every second


function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return "just now";
} 