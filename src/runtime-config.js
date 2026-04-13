(function () {
    // Ensure a minimal Firebase config exists to avoid initialization errors in environments without real config
    window.APP_CONFIG = window.APP_CONFIG || {};
    window.APP_CONFIG.firebase = window.APP_CONFIG.firebase || {
        apiKey: "FAKE_API_KEY",
        authDomain: "fake-app.firebaseapp.com",
        projectId: "fake-project",
        storageBucket: "fake-app.appspot.com",
        messagingSenderId: "1234567890",
        appId: "1:1234567890:web:fakeid"
    };
    var paymentMeta = document.querySelector('meta[name="relovetree-payment-client-key"]');
    var appCheckMeta = document.querySelector('meta[name="relovetree-app-check-site-key"]');

    window.RELOVETREE_FIREBASE_CONFIG = window.RELOVETREE_FIREBASE_CONFIG || {};
    window.RELOVETREE_PAYMENT_CONFIG = Object.assign({
        clientKey: paymentMeta ? String(paymentMeta.getAttribute('content') || '').trim() : '',
        amount: 9900,
        orderName: 'Lovetree Pro (무제한 이용권)',
        verifyEndpoint: '/api/payment/verify'
    }, window.RELOVETREE_PAYMENT_CONFIG || {});
    window.RELOVETREE_APP_CHECK_CONFIG = Object.assign({
        siteKey: appCheckMeta ? String(appCheckMeta.getAttribute('content') || '').trim() : '',
        autoRefreshToken: true
    }, window.RELOVETREE_APP_CHECK_CONFIG || {});
})();
