const { buildResponse, handleError, httpError, ok } = require('./_lib/http');
const { requireUser } = require('./_lib/firebase-auth');
const documentStore = require('./_lib/document-store');

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

async function verifyPayment(event) {
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(204, null);
  }

  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method not allowed' });
  }

  try {
    const user = await requireUser(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return buildResponse(400, { error: 'Invalid JSON body' });
    }

    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return buildResponse(400, { error: 'Missing required fields: paymentKey, orderId, amount' });
    }

    const expectedAmount = 9900;
    if (Number(amount) !== expectedAmount) {
      return buildResponse(400, { error: `Invalid amount. Expected ${expectedAmount}` });
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error('TOSS_SECRET_KEY not configured');
      return buildResponse(500, { error: 'Payment service unavailable' });
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
      });
    }

    if (tossResult.status !== 'DONE' && tossResult.status !== 'PAID') {
      console.error('Payment not completed:', tossResult.status);
      return buildResponse(400, { error: 'Payment not completed' });
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
    });

  } catch (err) {
    if (err.status === 401) {
      return buildResponse(401, { error: 'Authentication required' });
    }
    return handleError('payment-verify', err);
  }
}

exports.handler = verifyPayment;