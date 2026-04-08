(function () {
    function createElement(tag, attributes, content) {
        const element = document.createElement(tag);
        const attrs = attributes || {};
        const children = content || '';

        Object.entries(attrs).forEach(function ([key, value]) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value || {}).forEach(function ([dataKey, dataValue]) {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        if (children) {
            if (typeof children === 'string') {
                element.innerHTML = children;
            } else if (children instanceof Node) {
                element.appendChild(children);
            } else if (Array.isArray(children)) {
                children.forEach(function (child) {
                    if (typeof child === 'string') {
                        element.innerHTML += child;
                    } else if (child instanceof Node) {
                        element.appendChild(child);
                    }
                });
            }
        }

        return element;
    }

    function hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.classList.add('is-hidden');
        }
    }

    function showError(message, duration) {
        const timeout = typeof duration === 'number' ? duration : 5000;
        let errorDiv = document.getElementById('error-message');

        if (!errorDiv) {
            errorDiv = createElement('div', {
                id: 'error-message',
                className: 'is-hidden ui-error-banner',
                role: 'alert',
                'aria-live': 'polite'
            });

            const errorText = createElement('span', { id: 'error-text' });
            const closeBtn = createElement('button', {
                className: 'ui-error-close',
                'aria-label': '오류 메시지 닫기'
            });
            closeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            closeBtn.onclick = hideError;

            errorDiv.append(errorText, closeBtn);
            document.body.appendChild(errorDiv);
        }

        const errorText = errorDiv.querySelector('#error-text');
        if (errorText) {
            errorText.textContent = message;
        }
        errorDiv.classList.remove('is-hidden');

        if (timeout > 0) {
            window.setTimeout(hideError, timeout);
        }
    }

    function clearValidationErrors(form) {
        if (!form) return;

        form.querySelectorAll('.error-message').forEach(function (el) { el.remove(); });
        form.querySelectorAll('.border-red-500').forEach(function (el) { el.classList.remove('border-red-500'); });
        form.querySelectorAll('[aria-invalid="true"]').forEach(function (el) { el.setAttribute('aria-invalid', 'false'); });
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (typeof modal.close === 'function') {
            modal.close();
        } else {
            modal.removeAttribute('open');
        }

        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            clearValidationErrors(form);
        }
    }

    function setupModalKeyboardHandlers() {
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;

            const openModal = document.querySelector('dialog[open]');
            if (openModal && typeof openModal.close === 'function') {
                openModal.close();
            }
        });
    }

    async function copyTextToClipboard(text) {
        const value = String(text || '');
        if (!value) return false;

        try {
            if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(value);
                return true;
            }
        } catch (e) {
        }

        try {
            const el = document.createElement('textarea');
            el.value = value;
            el.setAttribute('readonly', '');
            el.style.position = 'fixed';
            el.style.left = '-9999px';
            document.body.appendChild(el);
            el.select();
            const ok = document.execCommand('copy');
            el.remove();
            return !!ok;
        } catch (e) {
            return false;
        }
    }

    function showToast(message) {
        try {
            const toast = document.createElement('div');
            toast.className = 'ui-toast';
            toast.innerText = message;
            document.body.appendChild(toast);
            requestAnimationFrame(function () { toast.classList.add('is-visible'); });
            setTimeout(function () {
                toast.classList.remove('is-visible');
                setTimeout(function () { toast.remove(); }, 300);
            }, 2000);
        } catch (e) {
            alert(message);
        }
    }

    const api = {
        createElement: createElement,
        showError: showError,
        hideError: hideError,
        closeModal: closeModal,
        clearValidationErrors: clearValidationErrors,
        setupModalKeyboardHandlers: setupModalKeyboardHandlers,
        copyTextToClipboard: copyTextToClipboard,
        showToast: showToast
    };

    window.ReloveSharedDom = api;
    window.createElement = createElement;
    window.showError = showError;
    window.hideError = hideError;
    window.closeModal = closeModal;
    window.clearValidationErrors = clearValidationErrors;
    window.setupModalKeyboardHandlers = setupModalKeyboardHandlers;
    window.copyTextToClipboard = copyTextToClipboard;
    window.showToast = showToast;
})();
