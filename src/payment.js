/**
 * Relovetree - Payment Module
 * Integrates Toss Payments
 * Note: role/pro 권한 변경은 서버 검증 후에만 처리되어야 한다.
 */

// Configuration
const PAYMENT_CONFIG = {
    clientKey: 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq', // Test Key from 26-md-reader
    amount: 9900,
    orderName: 'Relovetree Pro (무제한 이용권)'
};

let tossPayments = null;

function clearPaymentStatusFromUrl() {
    window.history.replaceState({}, document.title, window.location.pathname);
}

/**
 * Initialize Payment System
 */
function initPayment() {
    if (window.TossPayments) {
        tossPayments = TossPayments(PAYMENT_CONFIG.clientKey);
    } else {
        console.warn('Toss Payments SDK not loaded');
    }
}

/**
 * Request Payment
 * @param {string} userEmail - User's email
 * @param {string} userName - User's name
 */
function requestPayment(userEmail, userName) {
    if (!tossPayments) {
        alert('결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    const orderId = 'ORDER_' + new Date().getTime();

    tossPayments.requestPayment('카드', {
        amount: PAYMENT_CONFIG.amount,
        orderId: orderId,
        orderName: PAYMENT_CONFIG.orderName,
        customerName: userName || 'Relovetree User',
        customerEmail: userEmail,
        successUrl: window.location.origin + '/index.html?payment=success',
        failUrl: window.location.origin + '/index.html?payment=fail',
    }).catch(function (error) {
        if (error.code === 'USER_CANCEL') {
            // User canceled
        } else {
            alert('결제 실패: ' + error.message);
        }
    });
}

/**
 * Check Payment Result (on page load)
 */
async function checkPaymentResult() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
        clearPaymentStatusFromUrl();

        // TODO(payment-server): 결제 성공 후 paymentKey/orderId/amount를 서버 검증 API로 전송하고,
        // 서버에서만 users/{uid}의 Pro 상태를 반영해야 한다.
        alert('결제 요청이 접수되었습니다. 서버 확인 후 Pro 혜택이 반영됩니다.');

    } else if (paymentStatus === 'fail') {
        clearPaymentStatusFromUrl();
        alert('결제가 실패했습니다. 다시 시도해주세요.');
    }
}

// Export
window.initPayment = initPayment;
window.requestPayment = requestPayment;
window.checkPaymentResult = checkPaymentResult;

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    initPayment();
    checkPaymentResult();
});
