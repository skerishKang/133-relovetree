const { buildResponse, getCorsHeaders, handleError } = require('./_lib/http');
const { requireUser } = require('./_lib/firebase-auth');
const documentStore = require('./_lib/document-store');

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

async function verifyPayment(event) {
  const requestOrigin = event && event.headers ? (event.headers.origin || event.headers.Origin || '') : '';

  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(204, null, getCorsHeaders(requestOrigin));
  }

  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method not allowed' }, getCorsHeaders(requestOrigin));
  }

  try {
    const user = await requireUser(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return buildResponse(400, { error: 'Invalid JSON body' }, getCorsHeaders(requestOrigin));
    }

    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return buildResponse(400, { error: 'Missing required fields: paymentKey, orderId, amount' }, getCorsHeaders(requestOrigin));
    }

    const expectedAmount = Number(process.env.TOSS_PRO_AMOUNT || 9900);
    if (Number(amount) !== expectedAmount) {
      return buildResponse(400, { error: `Invalid amount. Expected ${expectedAmount}` }, getCorsHeaders(requestOrigin));
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error('TOSS_SECRET_KEY not configured');
      return buildResponse(500, { error: 'Payment service unavailable' }, getCorsHeaders(requestOrigin));
    }

    const auth = Buffer.from(secretKey + ':').toString('base64');

    const tossResponse = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        amount,
        orderId,
      }),
    });

    const tossResult = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('Toss payment verification failed:', tossResult);
      return buildResponse(400, {
        error: 'Payment verification failed',
        code: tossResult.code || 'UNKNOWN'
      }, getCorsHeaders(requestOrigin));
    }

    if (tossResult.status !== 'DONE' && tossResult.status !== 'PAID') {
      console.error('Payment not completed:', tossResult.status);
      return buildResponse(400, { error: 'Payment not completed' }, getCorsHeaders(requestOrigin));
    }

    const userDoc = await documentStore.getDoc(`users/${user.uid}`);
    const currentData = userDoc && userDoc.data ? userDoc.data : {};

    await documentStore.setDoc(`users/${user.uid}`, {
      ...currentData,
      isPro: true,
      role: currentData.role === 'admin' ? 'admin' : 'pro',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`Payment verified for user ${user.uid}, order ${orderId}`);

    return buildResponse(200, {
      ok: true,
      isPro: true,
      orderId,
      amount: tossResult.totalAmount
    }, getCorsHeaders(requestOrigin));

  } catch (err) {
    if (err.status === 401) {
      return buildResponse(401, { error: 'Authentication required' }, getCorsHeaders(requestOrigin));
    }
    return handleError('payment-verify', err, requestOrigin);
  }
}

exports.handler = verifyPayment;
