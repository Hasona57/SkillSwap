import { $, $$ } from './utils.js';
import { login, signup, logout, getCurrentUser } from './api.js';
import { showToast } from './utils.js';
import { subscribe, updateState } from './state.js';

let authModal;
let loginForm, signupForm;
let authTabs;
let userMenu, authButtons, userName;

export function initAuth() {
    authModal = $('#authModal');
    loginForm = $('#loginForm');
    signupForm = $('#signupForm');
    authTabs = $$('.auth-tab');
    userMenu = $('#userMenu');
    authButtons = $('#authButtons');
    userName = $('#userName');

    bindAuthEvents();
    subscribe(updateAuthUI);
    updateAuthUI();
}

function bindAuthEvents() {
    $$('.login-button, .signup-button').forEach(btn => {
        btn.addEventListener('click', () => showAuthModal(btn.dataset.action));
    });

    authModal.querySelector('.close-modal').addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    $('#logoutButton').addEventListener('click', handleLogout);
}

export function showAuthModal(action = 'login') {
    authModal.style.display = 'block';
    switchTab(action);
}

function switchTab(tabName) {
    authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    $$('.auth-form').forEach(form => form.classList.toggle('active', form.id.includes(tabName)));
    $('#authModalTitle').textContent = tabName === 'login' ? 'Welcome Back' : 'Create an Account';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = $('#loginEmail').value;
    const password = $('#loginPassword').value;
    const submitBtn = loginForm.querySelector('.submit-btn');
    setLoading(submitBtn, true);

    try {
        await login(email, password);
        authModal.style.display = 'none';
        loginForm.reset();
        showToast('Successfully logged in!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = $('#signupName').value;
    const email = $('#signupEmail').value;
    const password = $('#signupPassword').value;
    const submitBtn = signupForm.querySelector('.submit-btn');
    setLoading(submitBtn, true);

    try {
        await signup(name, email, password);
        authModal.style.display = 'none';
        signupForm.reset();
        showToast('Account created successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

async function handleLogout() {
    try {
        await logout();
        showToast('You have been logged out.', 'info');
    } catch (error) {
        showToast('Logout failed. Please try again.', 'error');
    }
}

function updateAuthUI() {
    const user = getCurrentUser();
    if (user) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'block';
        userName.textContent = user.name;
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

function setLoading(button, isLoading) {
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
} 