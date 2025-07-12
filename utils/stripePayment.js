
const path = require("path");

const envFilePath = path.resolve(__dirname, "../.env");
const env = require("dotenv").config({ path: envFilePath });
if (env.error) {
  throw new Error(
    `Unable to load the .env file from ${envFilePath}. Please copy .env.example to ${envFilePath}`
  );
}

const stripe = require("stripe")(process.env.STRIPE_API_SECRET);

// const stripe = new Stripe(process.env.STRIPE_API_SECRET, {
//   apiVersion: '2024-06-20',
//   typescript: true,
// });

 const createCheckoutSession = async (payload) => { 
  const paymentGatewayData = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: payload?.product?.name,
          },
          unit_amount: payload.product?.amount * 100,
        },
        quantity: payload.product?.quantity,
      },
    ],

    success_url: `${process.env.SERVER_URL}/memberships/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&membership=${payload?.paymentId}&user=${payload?.userId}`,
    cancel_url: process.env.CANCEL_URL, 
    // `${config.server_url}/payments/cancel?paymentId=${payload?.paymentId}`,
    mode: 'payment',
    // metadata: {
    //   user: JSON.stringify({
    //     paymentId: payment.id,
    //   }),
    // },
    invoice_creation: {
      enabled: true,
    },
    // customer: payload?.customerId,
    // payment_intent_data: {
    //   metadata: {
    //     payment: JSON.stringify({
    //       ...payment,
    //     }),
    //   },
    // },
    // payment_method_types: ['card', 'amazon_pay', 'cashapp', 'us_bank_account'],
    payment_method_types: ['card'],
  });

  return paymentGatewayData;
};


module.exports = createCheckoutSession