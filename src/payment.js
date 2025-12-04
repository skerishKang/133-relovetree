/**
 * Relovetree - Payment Module
 * Integrates Toss Payments
 */

// Configuration
const PAYMENT_CONFIG = {
    clientKey: 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq', // Test Key from 26-md-reader
    amount: 9900,
    orderName: 'Relovetree Pro (무제한 이용권)'
};

let tossPayments = null;

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
        const paymentKey = urlParams.get('paymentKey');
        const orderId = urlParams.get('orderId');
        const amount = urlParams.get('amount');

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);

        // In a real app, verify payment with backend here.
        // For this MVP/Client-side demo, we'll assume success and upgrade the user.

        alert('결제가 완료되었습니다! Pro 등급으로 업그레이드 중...');
        await upgradeUserToPro();

    } else if (paymentStatus === 'fail') {
        alert('결제가 실패했습니다. 다시 시도해주세요.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Upgrade User to Pro (Client-side Logic)
 */
async function upgradeUserToPro() {
    const user = firebase.auth().currentUser;
    if (!user) {
        // If auth not ready, wait a bit or show error
        // Since this runs on page load, auth might take a moment
        firebase.auth().onAuthStateChanged(async (u) => {
            if (u) {
                await performUpgrade(u.uid);
            }
        });
        return;
    }
    await performUpgrade(user.uid);
}

async function performUpgrade(uid) {
    try {
        await firebase.firestore().collection('users').doc(uid).update({
            role: 'pro',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('축하합니다! Pro 등급으로 업그레이드되었습니다.');
        window.location.reload();
    } catch (error) {
        console.error('Error upgrading user:', error);
        alert('등급 변경 중 오류가 발생했습니다. 관리자에게 문의해주세요.');
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
