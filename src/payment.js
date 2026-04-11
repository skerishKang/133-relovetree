/**
 * Lovetree - Payment Module
 * Integrates Toss Payments
 * Note: role/pro 권한 변경은 서버 검증 후에만 처리되어야 한다.
 */

function getPaymentConfig() {
    const runtimeConfig = window.RELOVETREE_PAYMENT_CONFIG || {};
    const clientKey = String(runtimeConfig.clientKey || '').trim();
    const amount = Number(runtimeConfig.amount || 0);

    return {
        clientKey: clientKey,
        amount: amount,
        orderName: runtimeConfig.orderName || 'Lovetree Pro (무제한 이용권)',
        verifyEndpoint: runtimeConfig.verifyEndpoint || '/api/payment/verify'
    };
}

let tossPayments = null;

function clearPaymentStatusFromUrl() {
    window.history.replaceState({}, document.title, window.location.pathname);
}

/**
 * Initialize Payment System
 */
function initPayment() {
    const paymentConfig = getPaymentConfig();
    if (!paymentConfig.clientKey || !paymentConfig.amount) {
        console.warn('Payment config not set. Payment features are disabled.');
        tossPayments = null;
        return;
    }

    if (window.TossPayments) {
        tossPayments = TossPayments(paymentConfig.clientKey);
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
    const paymentConfig = getPaymentConfig();

    if (!paymentConfig.clientKey || !paymentConfig.amount) {
        alert('결제 설정이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    if (!tossPayments) {
        alert('결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    const orderId = 'ORDER_' + new Date().getTime();

    tossPayments.requestPayment('카드', {
        amount: paymentConfig.amount,
        orderId: orderId,
        orderName: paymentConfig.orderName,
        customerName: userName || 'Lovetree User',
        customerEmail: userEmail,
        successUrl: window.location.origin + '/index.html?payment=success&orderId=' + orderId,
        failUrl: window.location.origin + '/index.html?payment=fail',
    }).then(function(result) {
        // Toss Payments v1 SDK returns paymentKey in result
        // After payment success, we need to verify on the server
        if (result && result.paymentKey) {
            verifyPaymentWithServer(result.paymentKey, orderId, paymentConfig.amount).then(function(verifyResult) {
                if (verifyResult.ok && verifyResult.isPro) {
                    alert('결제가 완료되었습니다. Pro 혜택이 적용되었습니다!');
                    if (typeof window.refreshUserMenu === 'function') {
                        window.refreshUserMenu();
                    }
                } else if (verifyResult.ok && !verifyResult.isPro) {
                    alert('결제는 완료되었으나 Pro 적용에 문제가 발생했습니다.\n고객센터에 문의해주세요.');
                }
            });
        }
    }).catch(function(error) {
        if (error.code === 'USER_CANCEL') {
            // User canceled
        } else {
            alert('결제 실패: ' + error.message);
        }
    });
}

/**
 * Verify Payment with Server
 * @param {string} paymentKey - Payment key from Toss
 * @param {string} orderId - Order ID
 * @param {number} amount - Payment amount
 * @returns {Promise<{ok: boolean, isPro?: boolean, error?: string}>}
 */
async function verifyPaymentWithServer(paymentKey, orderId, amount) {
    const paymentConfig = getPaymentConfig();
    try {
        const token = await getAuthToken();
        const response = await fetch(paymentConfig.verifyEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? 'Bearer ' + token : ''
            },
            body: JSON.stringify({
                paymentKey,
                orderId,
                amount
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, error: data.error || 'Payment verification failed' };
        }

        return { ok: true, isPro: data.isPro };
    } catch (err) {
        console.error('Payment verification error:', err);
        return { ok: false, error: '서버 연결 오류' };
    }
}

/**
 * Get Firebase ID Token
 * @returns {Promise<string>}
 */
async function getAuthToken() {
    try {
        if (!firebase.auth || !firebase.auth()) return '';
        const user = firebase.auth().currentUser;
        if (!user || typeof user.getIdToken !== 'function') return '';
        return await user.getIdToken();
    } catch (e) {
        return '';
    }
}

/**
 * Check Payment Result (on page load)
 */
async function checkPaymentResult() {
    const paymentConfig = getPaymentConfig();
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderId = urlParams.get('orderId');

    if (paymentStatus === 'success') {
        const paymentKey = urlParams.get('paymentKey');
        
        if (paymentKey) {
            clearPaymentStatusFromUrl();

            if (!paymentConfig.amount) {
                alert('결제 설정이 없어 검증을 진행할 수 없습니다. 고객센터에 문의해주세요.');
                return;
            }

            const result = await verifyPaymentWithServer(paymentKey, orderId, paymentConfig.amount);
            
            if (result.ok && result.isPro) {
                alert('결제가 완료되었습니다. Pro 혜택이 적용되었습니다!');
                if (typeof window.refreshUserMenu === 'function') {
                    window.refreshUserMenu();
                }
            } else {
                alert('결제 검증 실패: ' + (result.error || '알 수 없는 오류') + '\n고객센터에 문의해주세요.');
            }
        } else {
            clearPaymentStatusFromUrl();
            alert('결제가 완료되었습니다.\nPro 혜택은 결제 확인 후 자동 적용됩니다.\n(최대 몇 분 소요)');
        }

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
