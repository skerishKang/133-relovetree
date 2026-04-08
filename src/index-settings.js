(function () {
    const BG_STORAGE_KEY = 'relovetree_background';
    const BACKUP_PREFIX = 'relovetree_';

    function closeSettingsModalIfOpen() {
        try {
            if (typeof closeModal === 'function') {
                closeModal('settings-modal');
            }
        } catch (e) {
        }
    }

    function myMenuCloseAndScrollTo(sectionId) {
        closeSettingsModalIfOpen();

        window.setTimeout(function () {
            const section = document.getElementById(sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }

    function myMenuGoCommunity() {
        closeSettingsModalIfOpen();
        window.location.href = '/pages/community.html';
    }

    function myMenuGoOwnerConsole() {
        closeSettingsModalIfOpen();
        window.location.href = '/pages/owner.html';
    }

    function myMenuGoTheme() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        window.setTimeout(function () {
            const anchor = document.getElementById('my-theme-anchor');
            if (anchor && typeof anchor.scrollIntoView === 'function') {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }

    function collectLocalBackupData() {
        const data = {
            meta: {
                version: '1',
                createdAt: new Date().toISOString(),
                prefix: BACKUP_PREFIX
            },
            items: {}
        };

        try {
            if (typeof localStorage === 'undefined') return data;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith(BACKUP_PREFIX)) continue;
                data.items[key] = localStorage.getItem(key);
            }
        } catch (e) {
            console.error('로컬 백업 데이터 수집 실패:', e);
        }

        return data;
    }

    function exportLocalBackup() {
        try {
            const backup = collectLocalBackupData();
            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'relovetree-backup-' + Date.now() + '.json';
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 500);
        } catch (e) {
            console.error('백업 파일 저장 실패:', e);
            try {
                showError('백업 파일 저장에 실패했습니다.', 5000);
            } catch (err) {
            }
        }
    }

    function importLocalBackupFromFile(file) {
        try {
            if (!file) return;

            const ok = window.confirm('백업 파일을 불러오면, 현재 기기의 relovetree_* 데이터가 모두 삭제되고 백업으로 덮어씌워집니다. 계속할까요?');
            if (!ok) return;

            const reader = new FileReader();
            reader.onload = function () {
                try {
                    const text = String(reader.result || '');
                    const parsed = JSON.parse(text);

                    if (!parsed || typeof parsed !== 'object' || !parsed.items || typeof parsed.items !== 'object') {
                        showError('백업 파일 형식이 올바르지 않습니다.', 5000);
                        return;
                    }

                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(BACKUP_PREFIX)) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(function (key) {
                        localStorage.removeItem(key);
                    });

                    Object.keys(parsed.items).forEach(function (key) {
                        if (!key || !key.startsWith(BACKUP_PREFIX)) return;
                        const value = parsed.items[key];
                        if (typeof value !== 'string') return;
                        localStorage.setItem(key, value);
                    });

                    window.location.reload();
                } catch (e) {
                    console.error('백업 파일 불러오기 실패:', e);
                    try {
                        showError('백업 파일 불러오기에 실패했습니다.', 5000);
                    } catch (err) {
                    }
                }
            };
            reader.readAsText(file);
        } catch (e) {
            console.error('백업 파일 불러오기 실패:', e);
        }
    }

    function triggerImportLocalBackup() {
        const input = document.getElementById('local-backup-file');
        if (!input) return;
        input.value = '';

        try {
            input.onchange = function () {
                const file = input.files && input.files[0];
                if (!file) return;
                importLocalBackupFromFile(file);
            };
        } catch (e) {
        }

        input.click();
    }

    function applyBackgroundConfig(config) {
        const body = document.body;
        if (!body || !config) return;

        if (config.type === 'image' && config.value) {
            body.style.backgroundImage = "url('" + config.value + "')";
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundRepeat = 'no-repeat';
            body.style.backgroundColor = '';
        } else if (config.type === 'color' && config.value) {
            body.style.backgroundImage = 'none';
            body.style.backgroundColor = config.value;
        }
    }

    function setBackground(type, value) {
        const config = { type: type, value: value };
        applyBackgroundConfig(config);
        safeLocalStorageSet(BG_STORAGE_KEY, config);
    }

    function resetBackground() {
        const defaultConfig = { type: 'color', value: '#f8fafc' };
        applyBackgroundConfig(defaultConfig);
        safeLocalStorageRemove(BG_STORAGE_KEY);
    }

    function applyCustomBackground() {
        const input = document.getElementById('custom-bg-url');
        if (!input) return;
        const url = input.value.trim();
        if (!url) return;
        setBackground('image', url);
    }

    function loadBackgroundPreference() {
        const saved = safeLocalStorageGet(BG_STORAGE_KEY, null);
        if (saved && (saved.type === 'image' || saved.type === 'color')) {
            applyBackgroundConfig(saved);
        }
    }

    function processBackgroundFile(file) {
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const result = e.target && e.target.result;
            if (typeof result === 'string') {
                setBackground('image', result);
            }
        };
        reader.readAsDataURL(file);
    }

    function triggerBackgroundFileInput() {
        const input = document.getElementById('custom-bg-file');
        if (input) {
            input.click();
        }
    }

    function handleBackgroundFileChange(event) {
        const input = event.target;
        if (!input || !input.files || input.files.length === 0) return;
        processBackgroundFile(input.files[0]);
    }

    function initBackgroundFileControls() {
        const dropzone = document.getElementById('custom-bg-dropzone');
        const fileInput = document.getElementById('custom-bg-file');

        if (fileInput) {
            fileInput.addEventListener('change', handleBackgroundFileChange);
        }

        if (!dropzone) return;

        const highlight = function () { dropzone.classList.add('bg-slate-100'); };
        const unhighlight = function () { dropzone.classList.remove('bg-slate-100'); };

        ['dragenter', 'dragover'].forEach(function (eventName) {
            dropzone.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                highlight();
            });
        });

        ['dragleave', 'drop'].forEach(function (eventName) {
            dropzone.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                unhighlight();
            });
        });

        dropzone.addEventListener('drop', function (e) {
            const dt = e.dataTransfer;
            if (!dt || !dt.files || dt.files.length === 0) return;
            processBackgroundFile(dt.files[0]);
        });
    }

    function openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        if (typeof modal.showModal === 'function') {
            modal.showModal();
        } else {
            modal.setAttribute('open', 'open');
        }
    }

    function openCreateModal() {
        if (typeof hideError === 'function') hideError();

        const user = typeof ensureLoggedIn === 'function' ? ensureLoggedIn() : null;
        if (!user) return;

        const nameInput = document.getElementById('artist-name');
        if (nameInput) {
            nameInput.value = '';
            nameInput.focus();
        }

        const modal = document.getElementById('create-modal');
        if (modal) {
            modal.showModal();
        }
    }

    function handleCreate(e) {
        e.preventDefault();
        if (typeof hideError === 'function') hideError();

        const user = typeof ensureLoggedIn === 'function' ? ensureLoggedIn() : null;
        if (!user) return;

        const nameInput = document.getElementById('artist-name');
        const name = nameInput?.value?.trim();

        if (!name) {
            const error = typeof validateArtistName === 'function' ? validateArtistName('', true) : '아티스트 이름을 입력해주세요.';
            if (error) {
                nameInput?.classList.add('border-red-500');
                if (typeof showError === 'function') showError(error);
                nameInput?.focus();
                return;
            }
        }

        const validationError = typeof validateArtistName === 'function' ? validateArtistName(name, true) : null;
        if (validationError) {
            nameInput?.classList.add('border-red-500');
            if (typeof showError === 'function') showError(validationError);
            nameInput?.focus();
            return;
        }

        try {
            if (name) {
                const encodedName = encodeURIComponent(name);
                window.location.href = `/pages/editor.html?id=${encodedName}`;
            }
        } catch (error) {
            console.error('Navigation error:', error);
            if (typeof showError === 'function') showError('페이지 이동 중 오류가 발생했습니다.');
        }
    }

    const api = {
        myMenuCloseAndScrollTo: myMenuCloseAndScrollTo,
        myMenuGoCommunity: myMenuGoCommunity,
        myMenuGoOwnerConsole: myMenuGoOwnerConsole,
        myMenuGoTheme: myMenuGoTheme,
        collectLocalBackupData: collectLocalBackupData,
        exportLocalBackup: exportLocalBackup,
        triggerImportLocalBackup: triggerImportLocalBackup,
        importLocalBackupFromFile: importLocalBackupFromFile,
        applyBackgroundConfig: applyBackgroundConfig,
        setBackground: setBackground,
        resetBackground: resetBackground,
        applyCustomBackground: applyCustomBackground,
        loadBackgroundPreference: loadBackgroundPreference,
        triggerBackgroundFileInput: triggerBackgroundFileInput,
        initBackgroundFileControls: initBackgroundFileControls,
        openSettingsModal: openSettingsModal,
        openCreateModal: openCreateModal,
        handleCreate: handleCreate
    };

    window.ReloveIndexSettings = api;
    window.myMenuCloseAndScrollTo = myMenuCloseAndScrollTo;
    window.myMenuGoCommunity = myMenuGoCommunity;
    window.myMenuGoOwnerConsole = myMenuGoOwnerConsole;
    window.myMenuGoTheme = myMenuGoTheme;
    window.exportLocalBackup = exportLocalBackup;
    window.triggerImportLocalBackup = triggerImportLocalBackup;
    window.setBackground = setBackground;
    window.resetBackground = resetBackground;
    window.applyCustomBackground = applyCustomBackground;
    window.loadBackgroundPreference = loadBackgroundPreference;
    window.triggerBackgroundFileInput = triggerBackgroundFileInput;
    window.initBackgroundFileControls = initBackgroundFileControls;
    window.openSettingsModal = openSettingsModal;
    window.openCreateModal = openCreateModal;
    window.handleCreate = handleCreate;
})();
