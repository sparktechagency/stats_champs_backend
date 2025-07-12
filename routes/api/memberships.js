const express = require("express");
const Membership = require("../../models/Membership");
const User = require("../../models/User");
const auth = require("../../middleware/auth");
const axios = require("axios");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const path = require("path");
const envFilePath = path.resolve(__dirname, "../../.env");
const env = require("dotenv").config({ path: envFilePath });
if (env.error) {
  throw new Error(
    `Unable to load the .env file from ${envFilePath}. Please copy .env.example to ${envFilePath}`
  );
}
const stripe = require("stripe")(process.env.STRIPE_API_SECRET);
const paypal = require("paypal-rest-sdk");
const createCheckoutSession = require("../../utils/stripePayment");
const crypto = require("crypto");
const Subscription = require("../../models/subscriptions");
const moment = require("moment");
const { createNotification } = require("../../services/notification.service");

// Configure PayPal
paypal.configure({
  mode: "sandbox", // Change to 'live' for production
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API } = process.env;

// Generate Access Token
const generateAccessToken = async () => {
  const auth = Buffer.from(
    PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET
  ).toString("base64");

  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return response.data.access_token;
};

// @route    POST api/memberships/
// @desc     Create a new Membership
// @access   Public for Admin

// @route    POST api/memberships/
// @desc     Create a new Membership
// @access   Public for Admin

// paypal

// Create a product in PayPal
//  const product_paypal = await paypal.catalog.product.create({
//     name,
//     description,
//     type: "SERVICE",
//   });

// @route    GET api/memberships/
// @desc     Get all memberships
// @access   Public

router.get("/", auth, async (req, res) => {
  try {
    const memberships = await Membership.find({ activated: true });
    res.send(memberships);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/memberships/:id
// @desc     Get a membership by ID
// @access   Public

router.get("/:id", auth, async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership)
      return res.status(404).json({ error: "Membership not found" });

    res.status(200).send(membership);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// @route    PATCH api/memberships/:id
// @desc     Update a membership by ID
// @access   Public
router.patch("/:id", auth, async (req, res) => {
  try {
    const { name, amount, interval, description } = req.body;
    const originalMembership = await Membership.findById(req.params.id);
    if (!originalMembership)
      return res.status(404).send({ error: "Membership not found" });
    const product = await stripe.products.update(originalMembership.productId, {
      name,
      description,
    });
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    for (const price of existingPrices.data) {
      await stripe.prices.update(price.id, { active: false });
    }
    for (const price of existingPrices.data) {
      if (!price.active) {
        await stripe.prices.del(price.id);
      }
    }
    const price = await stripe.prices.create({
      unit_amount: amount * 100, // The price in cents (e.g., $10.00 is 1000 cents)
      currency: "usd", // Replace with your desired currency
      recurring: { interval },
      product: product.id,
    });

    const updatedMembership = await Membership.findByIdAndUpdate(
      req.params.id,
      { name, amount, interval, description, priceId: price.id },
      { new: true, runValidators: true }
    );

    res.status(200).send(updatedMembership);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// @route    DELETE(INACTIVE) api/memberships/:id
// @desc     Delete(Inactive) a membership by ID
// @access   Public

router.delete("/:id", auth, async (req, res) => {
  try {
    const membership = await Membership.findByIdAndUpdate(
      req.params.id,
      { activated: false },
      { new: true }
    );
    if (!membership)
      return res.status(404).send({ error: "Membership not found" });

    // Optionally, delete the product from Stripe

    // await stripe.products.del(membership.stripeProductId);

    res.status(200).send({ message: "Membership deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// @route    POST api/memberships/stripe/checkout/id
// @desc     Create a payment intent for a membership checkout
// @access   Private

router.post("/stripe/checkout", auth, async (req, res) => {
  let subscriptionId;
  const payload = req.body;
  const membership = await Membership.findById(req?.body?.membership);
  if (!membership)
    return res
      .status(404)
      .send({ success: false, message: "Membership not found" });

  const isExist = await Subscription.findOne({
    user: req.user.id,
    membership: payload.membership,
    isPaid: false,
  });

  if (isExist) {
    subscriptionId = isExist?._id;
  } else {
    const subscription = await Subscription.create({
      user: req.user.id,
      membership: req.body.membership,
      amount: membership?.amount,
    });
    subscriptionId = subscription?._id;
  }

  try {
    if (!subscriptionId) {
      return res
        .status(400)
        .json({ success: false, message: "subscriptions not found" });
    }
    const checkoutSession = await createCheckoutSession({
      // customerId: customer.id,
      product: {
        amount: membership?.amount,
        //@ts-ignore
        name: membership?.name || "membership payments",
        quantity: 1,
      },

      //@ts-ignore
      paymentId: subscriptionId,
      userId: req.user.id,
    });

    res.send({ url: checkoutSession?.url });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.post("/create-product", auth, async (req, res) => {
  const accessToken = await generateAccessToken();

  const productData = {
    name: req.body.name,
    description: req.body.description,
    type: "SERVICE",
    category: "SOFTWARE",
  };

  const response = await axios.post(
    `${PAYPAL_API}/v1/catalogs/products`,
    productData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  res.json(response.data);
});

// @route    POST api/memberships/paypal/checkout/id
// @desc     Create a subscription
// @access   Private

router.post("/paypal/checkout/:id", auth, async (req, res) => {
  const accessToken = await generateAccessToken();
  const membershipId = req.params.id;
  const membership = await Membership.findById(membershipId);
  if (!membership)
    return res.status(404).send({ error: "Membership not found" });
  if (!membership.planId) {
    const billingPlanAttributes = {
      product_id: membership.payPalProductId, // Use the product ID from the created product
      name: membership.name,
      description: membership.description,
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 for infinite cycles
          pricing_scheme: {
            fixed_price: {
              value: membership.amount.toString(), // The price for each cycle
              currency_code: "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "0",
          currency_code: "USD",
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    };

    const response = await axios.post(
      `${PAYPAL_API}/v1/billing/plans`,
      billingPlanAttributes,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data);
    //   membership.planId = plan.id;
    //   await membership.save();
  }
});

// @route    POST api/memberships/paypal/checkout/success/id
// @desc     Execute PayPal Agreement
// @access   Private

router.get("/paypal/checkout/success/:id", auth, async (req, res) => {
  const { token } = req.query;

  paypal.billingAgreement.execute(
    token,
    {},
    async (error, billingAgreement) => {
      if (error) {
        return res.status(500).send(error);
      } else {
        const user = await User.findById(req.user.id);

        user.memberships.push({
          membership: membership._id,
          purchaseDate: new Date(),
          expirationDate: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ), // Set end date to one month from now
          isActive: true,
        });
        await user.save();
        res.json({ message: "Subscription activated", billingAgreement });
      }
    }
  );
});

// @route    POST api/memberships/stripe/checkout/success/id
// @desc     Add a new membership to the user's memberships array after successful checkout
// @access   Public

function generateRandomString(length) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

router.get("/payments/confirm-payment", async (req, res) => {
  const { sessionId, membership } = req.query;

  if (!sessionId || !membership) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required parameters" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  // Retrieve Stripe Payment Session
  const PaymentSession = await stripe.checkout.sessions.retrieve(sessionId);
  const paymentIntentId = PaymentSession.payment_intent;

  if (PaymentSession.status !== "complete") {
    await session.abortTransaction();
    session.endSession();
    return res
      .status(400)
      .json({ success: false, message: "Payment session is not completed" });
  }

  try {
    // Activate Subscription
    const subscription = await Subscription.findByIdAndUpdate(
      membership,
      { $set: { isActive: true } },
      { new: true, session }
    ).populate("membership");

    if (!subscription) {
      return res
        .status(400)
        .json({ success: false, message: "Subscription not found" });
    }

    // Deactivate old subscription if it exists
    const oldSubscription = await Subscription.findOneAndUpdate(
      {
        user: subscription.user,
        membership: subscription.membership._id,
        isPaid: true,
        isActive: true,
      },
      { isActive: false },
      { session }
    );

    let endDate = moment();
    if (oldSubscription?.endDate && oldSubscription.endDate > new Date()) {
      const remainingTime = moment(oldSubscription.endDate).diff(moment());
      endDate = moment().add(remainingTime, "milliseconds");
    }

    endDate = endDate.add(subscription.membership.interval, "days");
    const expiredAt = endDate.toDate();

    // Update Subscription with Payment Info
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        isPaid: true,
        trnId: PaymentSession.id,
        endDate: expiredAt,
        paymentIntentId,
        isActive: true,
      },
      { new: true, session }
    );

    if (!updatedSubscription) {
      return res
        .status(400)
        .json({ success: false, message: "Failed to update subscription" });
    }

    // Update User's Active Subscription
    const user = await User.findByIdAndUpdate(
      subscription.user,
      { currentSubscriptions: updatedSubscription._id },
      { new: true, session }
    );

    const admin = await User.findOne({ role: "Admin" });
    await createNotification({
      receiver: user?._id,
      reference: subscription?._id,
      model_type: "Subscriptions",
      message: `🎉 Success! Your ${subscription?.membership?.name} subscription is now active! 🚀`,
      description: `Congratulations, ${user?.name}! Your payment of $${subscription?.membership?.amount}} for the ${subscription?.membership?.name}} plan has been successfully processed. You now have access to exclusive benefits. We’re excited to have you with us – enjoy the journey! 💫`,
    });
    await createNotification({
      receiver: admin?._id,
      reference: subscription?._id,
      model_type: "Subscriptions",
      message: `🎉 A new ${subscription?.membership?.name} subscription has been activated for ${user?.name}! 🚀`,
      description: `Hello Admin, ${user?.name} has successfully paid $${subscription?.membership?.amount} for the ${subscription?.membership?.name} plan. The subscription is now active, and the user is granted access to exclusive benefits. Keep up the great work! 💫`,
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, subscription });
  } catch (error) {
    console.error("Payment confirmation error:", error);

    // Attempt to refund if payment failed
    if (session.inTransaction() && paymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      } catch (refundError) {
        console.error("Refund failed:", refundError);
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({
          success: false,
          message: "Payment failed. Refund attempt unsuccessful.",
        });
      }
    }

    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  "/",
  check("name", "Name is required").notEmpty(),
  check("description", "Description is required").notEmpty(),
  check("amount", "Amount is required").notEmpty(),
  check("interval", "Interval is required").notEmpty(),
  auth,
  async (req, res) => {
    try {
      //   console.log("STRIPE_API_SECRET:", process.env.STRIPE_API_SECRET);
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send({ errors: errors.array() });
      }

      const { name, amount, interval, description } = req.body;

      // Create a product in Stripe
      const product_stripe = await stripe.products.create({
        name,
        description,
      });
      //   console.log("Stripe product created:", product_stripe);

      // Create a price for the product in Stripe
      const price_stripe = await stripe.prices.create({
        unit_amount: amount * 100, // Amount in cents
        currency: "usd",
        recurring: { interval },
        product: product_stripe.id,
      });

      // Save membership to MongoDB
      const membership = new Membership({
        productId: product_stripe.id,
        priceId: price_stripe.id,
        name,
        description,
        amount,
        interval,
      });
      await membership.save();

      res
        .status(201)
        .send({ product: product_stripe, price: price_stripe, membership });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  }
);

module.exports = router;
