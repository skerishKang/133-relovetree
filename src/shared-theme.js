(function () {
    function getStorageApi() {
        return window.ReloveSharedStorage || {};
    }

    function applyGlobalBackgroundPreference() {
        try {
            if (typeof document === 'undefined' || !document.body) return;

            const storage = getStorageApi();
            const read = storage.safeLocalStorageGet || window.safeLocalStorageGet;
            const config = typeof read === 'function'
                ? read('relovetree_background', null)
                : null;

            if (!config || !config.type || !config.value) return;

            const body = document.body;
            if (config.type === 'image') {
                body.style.backgroundImage = "url('" + config.value + "')";
                body.style.backgroundSize = 'cover';
                body.style.backgroundPosition = 'center';
                body.style.backgroundRepeat = 'no-repeat';
                body.style.backgroundAttachment = 'fixed';
                body.style.backgroundColor = '';
            } else if (config.type === 'color') {
                body.style.backgroundImage = 'none';
                body.style.backgroundColor = config.value;
            }
        } catch (e) {
            console.warn('applyGlobalBackgroundPreference failed:', e);
        }
    }

    function bindGlobalBackgroundPreferenceSync() {
        try {
            if (typeof window === 'undefined') return;
            window.addEventListener('storage', function (e) {
                if (!e || e.key !== 'relovetree_background') return;
                applyGlobalBackgroundPreference();
            });
        } catch (e) {
        }
    }

    const api = {
        applyGlobalBackgroundPreference: applyGlobalBackgroundPreference,
        bindGlobalBackgroundPreferenceSync: bindGlobalBackgroundPreferenceSync
    };

    window.ReloveSharedTheme = api;
    window.applyGlobalBackgroundPreference = applyGlobalBackgroundPreference;
    window.bindGlobalBackgroundPreferenceSync = bindGlobalBackgroundPreferenceSync;
})();
