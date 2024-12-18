const functions = require('firebase-functions');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
  key_id: 'rzp_test_9zwqD6dQkgBJo8',
  key_secret: '3kCLBry0pvhP7j4KE7PvETUI'
});

exports.verifyPayment = functions.https.onRequest((req, res) => {
  const { order_id, payment_id, signature } = req.body;

  const generatedSignature = crypto.createHmac('sha256', razorpayInstance.key_secret)
    .update(order_id + '|' + payment_id)
    .digest('hex');

  if (generatedSignature === signature) {
    // Payment is verified
    res.status(200).send({ success: true });
  } else {
    // Payment verification failed
    res.status(400).send({ success: false });
  }
});
