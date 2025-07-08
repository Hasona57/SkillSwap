export const $ = selector => document.querySelector(selector);
export const $$ = selector => Array.from(document.querySelectorAll(selector));

export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        console.error('Invalid input for escapeHtml:', unsafe);
        return '';
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = $('#toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${getToastIcon(type)}"></i>
        </div>
        <p>${message}</p>
        <button class="close-toast">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.close-toast');
    closeBtn.addEventListener('click', () => removeToast(toast));

    setTimeout(() => removeToast(toast), duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function removeToast(toast) {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
        toast.remove();
        const container = $('#toast-container');
        if (container && !container.hasChildNodes()) {
            container.remove();
        }
    });
}

function getToastIcon(type) {
    switch (type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-times-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
} 