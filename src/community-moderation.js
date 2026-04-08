(function () {
    function getModalState() {
        return window.__communityDeleteReasonModalState || null;
    }

    function setModalState(state) {
        window.__communityDeleteReasonModalState = state || null;
    }

    function normalizeModerationReason(reason) {
        try {
            const r = String(reason || '').trim();
            if (!r) return '';
            return r.slice(0, 200);
        } catch (e) {
            return '';
        }
    }

    function openDeleteReasonModal(options) {
        return new Promise(function (resolve) {
            const dialog = document.getElementById('delete-reason-modal');
            const titleEl = document.getElementById('delete-reason-title');
            const descEl = document.getElementById('delete-reason-desc');
            const inputEl = document.getElementById('delete-reason-input');
            const formEl = document.getElementById('delete-reason-form');

            if (!dialog || !inputEl || !formEl) {
                resolve({ ok: false, canceled: true, reason: '' });
                return;
            }

            const title = options && options.title ? String(options.title || '') : '삭제 사유';
            const desc = options && options.desc ? String(options.desc || '') : '삭제 사유를 입력해 주세요. (선택)';
            if (titleEl) titleEl.textContent = title;
            if (descEl) descEl.textContent = desc;
            inputEl.value = '';

            const finalize = function (result) {
                const modalState = getModalState();
                if (modalState && modalState.resolve) {
                    modalState.resolve(result);
                }
                setModalState(null);
            };

            const prevState = getModalState();
            if (prevState && prevState.resolve) {
                try {
                    prevState.resolve({ ok: false, canceled: true, reason: '' });
                } catch (e) {
                }
            }

            setModalState({ resolve: finalize });

            dialog.addEventListener('close', function onClose() {
                dialog.removeEventListener('close', onClose);
                if (!getModalState()) return;
                finalize({ ok: false, canceled: true, reason: '' });
            });

            formEl.onsubmit = function (e) {
                e.preventDefault();
                e.stopPropagation();
                const reason = normalizeModerationReason(inputEl.value);
                closeModal('delete-reason-modal');
                finalize({ ok: true, canceled: false, reason: reason });
            };

            if (typeof dialog.showModal === 'function') dialog.showModal();
            else dialog.setAttribute('open', '');
        });
    }

    function buildDeletedInfoHtmlForAdmin(data) {
        try {
            if (!data || data.isDeleted !== true) return '';

            const reason = escapeHtml(String(data.deletedReason || '').trim());
            const byEmail = escapeHtml(String(data.deletedByEmail || '').trim());
            const byUid = escapeHtml(String(data.deletedBy || '').trim());
            const byText = byEmail || byUid;
            const atText = formatCommunityDate(data.deletedAt);

            const parts = [];
            if (atText) parts.push(atText);
            if (byText) parts.push(byText);

            const meta = parts.length ? ' (' + escapeHtml(parts.join(' · ')) + ')' : '';
            const reasonText = reason ? ' - ' + reason : '';

            return '<div class="mt-2 text-[11px] text-slate-500">삭제 정보' + meta + reasonText + '</div>';
        } catch (e) {
            return '';
        }
    }

    window.CommunityModerationHelpers = {
        normalizeModerationReason: normalizeModerationReason,
        openDeleteReasonModal: openDeleteReasonModal,
        buildDeletedInfoHtmlForAdmin: buildDeletedInfoHtmlForAdmin
    };

    window.normalizeModerationReason = normalizeModerationReason;
    window.openDeleteReasonModal = openDeleteReasonModal;
    window.buildDeletedInfoHtmlForAdmin = buildDeletedInfoHtmlForAdmin;
})();
