(function () {
    function parseTimeMs(value) {
        try {
            if (!value) return 0;
            const t = Date.parse(String(value));
            return isNaN(t) ? 0 : t;
        } catch (e) {
            return 0;
        }
    }

    function getOwnerForkStatusCacheStorageKey(options) {
        if (!options.ownerUser || !options.ownerUser.uid) return '';
        return options.storageKeyPrefix + String(options.ownerUser.uid);
    }

    function loadOwnerForkStatusCacheFromStorage(options) {
        try {
            if (!options.ownerUser) {
                return {};
            }

            const key = getOwnerForkStatusCacheStorageKey(options);
            if (!key) return {};

            const saved = safeLocalStorageGet(key, null);
            if (!saved || typeof saved !== 'object') return {};

            const now = Date.now();
            const next = {};
            Object.keys(saved).forEach(function (treeId) {
                const v = saved[treeId];
                if (!v || typeof v !== 'object') return;
                const checkedAt = parseTimeMs(v.checkedAt);
                if (!checkedAt) return;
                if ((now - checkedAt) > options.ttlMs) return;

                next[String(treeId)] = {
                    checkedAt: String(v.checkedAt || ''),
                    hasUpdate: !!v.hasUpdate,
                    sourceLastUpdated: String(v.sourceLastUpdated || '')
                };
            });

            return next;
        } catch (e) {
            return {};
        }
    }

    function saveOwnerForkStatusCacheToStorage(options) {
        try {
            if (!options.ownerUser) return;
            const key = getOwnerForkStatusCacheStorageKey(options);
            if (!key) return;
            safeLocalStorageSet(key, options.ownerForkStatusCache || {});
        } catch (e) {
        }
    }

    window.OwnerForkCacheHelpers = {
        parseTimeMs: parseTimeMs,
        getOwnerForkStatusCacheStorageKey: getOwnerForkStatusCacheStorageKey,
        loadOwnerForkStatusCacheFromStorage: loadOwnerForkStatusCacheFromStorage,
        saveOwnerForkStatusCacheToStorage: saveOwnerForkStatusCacheToStorage
    };
})();
