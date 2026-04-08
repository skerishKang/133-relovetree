(function () {
    const translations = {
        ko: {
            defaultTreeTitle: '나의 러브트리',
            langBtn: 'English',
            placeholderComment: '이 순간에 대한 코멘트...',
            btnRegister: '등록',
            btnReset: '초기화',
            readOnlyBadge: '읽기 전용'
        },
        en: {
            defaultTreeTitle: 'My LoveTree',
            langBtn: '한국어',
            placeholderComment: 'Comment on this moment...',
            btnRegister: 'Add',
            btnReset: 'Reset',
            readOnlyBadge: 'Read only'
        }
    };

    function getStrings(runtime) {
        return runtime && runtime.isKorean === false ? translations.en : translations.ko;
    }

    function getTreeTitleElement() {
        return document.getElementById('tree-title');
    }

    function getReadOnlyBadgeElement() {
        return document.getElementById('tree-readonly-badge');
    }

    function getTreeTitle(runtime) {
        const titleEl = getTreeTitleElement();
        if (!titleEl) return getStrings(runtime).defaultTreeTitle;
        const text = titleEl.textContent ? String(titleEl.textContent).trim() : '';
        return text || getStrings(runtime).defaultTreeTitle;
    }

    function setTreeTitle(runtime, title) {
        const titleEl = getTreeTitleElement();
        if (!titleEl) return;
        const nextTitle = title && String(title).trim()
            ? String(title).trim()
            : getStrings(runtime).defaultTreeTitle;
        titleEl.textContent = nextTitle;
        titleEl.dataset.treeTitle = nextTitle;
    }

    function syncLanguageLabels(runtime) {
        const t = getStrings(runtime);
        const langBtn = document.getElementById('lang-btn');
        const commentInput = document.getElementById('new-moment-text');
        const submitBtn = document.querySelector('button[type="submit"]');
        const resetBtn = document.getElementById('btn-reset');

        if (langBtn) langBtn.textContent = t.langBtn;
        if (commentInput) commentInput.placeholder = t.placeholderComment;
        if (submitBtn) submitBtn.textContent = t.btnRegister;
        if (resetBtn) resetBtn.textContent = t.btnReset;
    }

    function setToggleButtonState(activeBtn, inactiveBtn) {
        if (activeBtn) {
            activeBtn.classList.add('bg-slate-800', 'text-white');
            activeBtn.classList.remove('bg-slate-100', 'text-slate-600');
        }
        if (inactiveBtn) {
            inactiveBtn.classList.remove('bg-slate-800', 'text-white');
            inactiveBtn.classList.add('bg-slate-100', 'text-slate-600');
        }
    }

    function syncModeButtons(runtime) {
        const treeBtn = document.getElementById('mode-tree-btn');
        const listBtn = document.getElementById('mode-timeline-btn');
        if ((runtime && runtime.editorMode) === 'timeline') {
            setToggleButtonState(listBtn, treeBtn);
            return;
        }
        setToggleButtonState(treeBtn, listBtn);
    }

    function syncOrientationButtons(runtime) {
        const portraitBtn = document.getElementById('orientation-portrait-btn');
        const landscapeBtn = document.getElementById('orientation-landscape-btn');
        const wrapper = document.getElementById('wrapper');
        const mode = runtime && runtime.orientationMode === 'landscape' ? 'landscape' : 'portrait';

        if (mode === 'landscape') {
            setToggleButtonState(landscapeBtn, portraitBtn);
        } else {
            setToggleButtonState(portraitBtn, landscapeBtn);
        }

        document.body.dataset.editorOrientation = mode;
        if (wrapper) wrapper.dataset.orientation = mode;
    }

    function syncReadOnlyState(runtime) {
        const titleEl = getTreeTitleElement();
        const badgeEl = getReadOnlyBadgeElement();
        const t = getStrings(runtime);
        const isReadOnly = !!(runtime && runtime.isReadOnly);

        if (titleEl) {
            titleEl.contentEditable = isReadOnly ? 'false' : 'true';
            titleEl.classList.toggle('bg-slate-100', isReadOnly);
            titleEl.classList.toggle('text-slate-500', isReadOnly);
        }

        if (badgeEl) {
            badgeEl.textContent = t.readOnlyBadge;
            badgeEl.classList.toggle('hidden', !isReadOnly);
        }
    }

    function syncHeaderState(runtime) {
        syncLanguageLabels(runtime);
        syncModeButtons(runtime);
        syncOrientationButtons(runtime);
        syncReadOnlyState(runtime);
    }

    function toggleLanguage(runtime) {
        runtime.isKorean = !(runtime.isKorean !== false);
        window.isKorean = runtime.isKorean;
        syncHeaderState(runtime);
        if (runtime && typeof runtime.render === 'function') {
            runtime.render();
        }
    }

    function setOrientationMode(runtime, mode) {
        if (mode !== 'portrait' && mode !== 'landscape') return;
        runtime.orientationMode = mode;
        syncOrientationButtons(runtime);
    }

    window.EditorHeaderHelpers = {
        getTreeTitle: getTreeTitle,
        setTreeTitle: setTreeTitle,
        syncLanguageLabels: syncLanguageLabels,
        syncModeButtons: syncModeButtons,
        syncOrientationButtons: syncOrientationButtons,
        syncReadOnlyState: syncReadOnlyState,
        syncHeaderState: syncHeaderState,
        toggleLanguage: toggleLanguage,
        setOrientationMode: setOrientationMode
    };
    window.toggleLanguage = function () {
        return toggleLanguage(window.__editorRuntime);
    };
    window.setOrientationMode = function (mode) {
        return setOrientationMode(window.__editorRuntime, mode);
    };
})();
