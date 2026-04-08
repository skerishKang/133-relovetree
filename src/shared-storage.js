(function () {
    function safeLocalStorageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('localStorage set failed:', error);
            return false;
        }
    }

    function safeLocalStorageGet(key, defaultValue) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : (defaultValue === undefined ? null : defaultValue);
        } catch (error) {
            console.warn('localStorage get failed:', error);
            return defaultValue === undefined ? null : defaultValue;
        }
    }

    function safeLocalStorageRemove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('localStorage remove failed:', error);
            return false;
        }
    }

    const api = {
        safeLocalStorageSet: safeLocalStorageSet,
        safeLocalStorageGet: safeLocalStorageGet,
        safeLocalStorageRemove: safeLocalStorageRemove
    };

    window.ReloveSharedStorage = api;
    window.safeLocalStorageSet = safeLocalStorageSet;
    window.safeLocalStorageGet = safeLocalStorageGet;
    window.safeLocalStorageRemove = safeLocalStorageRemove;
})();
