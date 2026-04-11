(function () {
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
