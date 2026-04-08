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
            errorDiv.classList.add('hidden');
        }
    }

    function showError(message, duration) {
        const timeout = typeof duration === 'number' ? duration : 5000;
        let errorDiv = document.getElementById('error-message');

        if (!errorDiv) {
            errorDiv = createElement('div', {
                id: 'error-message',
                className: 'hidden fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-4',
                role: 'alert',
                'aria-live': 'polite'
            });

            const errorText = createElement('span', { id: 'error-text' });
            const closeBtn = createElement('button', {
                className: 'text-white hover:text-red-200',
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
        errorDiv.classList.remove('hidden');

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

    const api = {
        createElement: createElement,
        showError: showError,
        hideError: hideError,
        closeModal: closeModal,
        clearValidationErrors: clearValidationErrors,
        setupModalKeyboardHandlers: setupModalKeyboardHandlers
    };

    window.ReloveSharedDom = api;
    window.createElement = createElement;
    window.showError = showError;
    window.hideError = hideError;
    window.closeModal = closeModal;
    window.clearValidationErrors = clearValidationErrors;
    window.setupModalKeyboardHandlers = setupModalKeyboardHandlers;
})();
