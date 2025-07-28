require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");

// Initialize Stripe with error handling
let stripe;
try {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.warn("⚠️ STRIPE_SECRET_KEY not found in environment variables. Stripe functionality will be disabled.");
    stripe = null;
  } else {
    console.log('stripeSecretKey', stripeSecretKey);
    stripe = require("stripe")(stripeSecretKey);
  }
} catch (error) {
  console.error("❌ Error initializing Stripe:", error.message);
  stripe = null;
}

const User = require("../models/user");
const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";
const Donations = require("../models/donations");
const { createNotification } = require("../utility/Email");


// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).send("Token required");
    try {
      const user = jwt.verify(token, SECRET_KEY);
      req.user = user;
      next();
    } catch (err) {
      res.status(401).send("Invalid token");
    }
  };

router.post("/create/donation-pool", authenticateToken, async (req, res) => {
  const { title, description, amount } = req.body;
  const createdBy = req.user?.email;
  if (!title || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const newDonationPool = new Donations({ title, description, amount, createdBy });
    const savedDonationPool = await newDonationPool.save();
    const user = await User.findOne({email: createdBy});
    
    // Send notifications to team members
    if (user && user.team && user.team.length > 0) {
      const notificationPromises = user.team.map(async (teamMember) => {
        return createNotification(
          teamMember.email,
          createdBy,
          "donation_pool",
          `${user.name} created a new donation pool: "${title}"`,
          { donationPool: savedDonationPool._id }
        );
      });
      
      await Promise.all(notificationPromises);
    }
    
    res.status(201).json({ message: "Donation pool created" });
  } catch (err) {
    res.status(500).json({ message: "Error creating donation pool", error: err.message });
  }
});

// Create payment intent for donation
router.post("/create-payment-intent", authenticateToken, async (req, res) => {
  
  const { donationPoolId, amount, donorName } = req.body;
  
  if (!donationPoolId || !amount || !donorName) {
    return res.status(400).json({ message: "Donation pool ID, amount, and donor name are required" });
  }

  try {
    // Verify donation pool exists
    const donationPool = await Donations.findById(donationPoolId);
    if (!donationPool) {
      return res.status(404).json({ message: "Donation pool not found" });
    }

    if (donationPool.status !== 'active') {
      return res.status(400).json({ message: "Donation pool is not active" });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        donationPoolId: donationPoolId,
        donorEmail: req.user.email,
        donorName: donorName
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: "Error creating payment intent", error: error.message });
  }
});

// Process successful donation
router.post("/process-donation", authenticateToken, async (req, res) => {
  const { donationPoolId, paymentIntentId, amount, donorName } = req.body;
  
  if (!donationPoolId || !paymentIntentId || !amount || !donorName) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: "Payment not completed" });
    }

    // Update donation pool
    const donationPool = await Donations.findById(donationPoolId);
    if (!donationPool) {
      return res.status(404).json({ message: "Donation pool not found" });
    }

    // Add donation to the pool
    donationPool.donations.push({
      donorEmail: req.user.email,
      donorName: donorName,
      amount: amount,
      paymentIntentId: paymentIntentId,
      paymentStatus: 'succeeded',
      donatedAt: new Date()
    });

    // Update amounts
    donationPool.currentAmount += amount;
    donationPool.totalAmount += amount;

    // Check if target amount is reached
    if (donationPool.currentAmount >= donationPool.amount) {
      donationPool.status = 'completed';
    }

    await donationPool.save();

    // Send notification to pool creator
    const poolCreator = await User.findOne({ email: donationPool.createdBy });
    if (poolCreator) {
      await createNotification(
        donationPool.createdBy,
        req.user.email,
        'donation_received',
        `${donorName} donated $${amount} to "${donationPool.title}"`,
        { donationPool: donationPool._id }
      );
    }

    res.status(200).json({ 
      message: "Donation processed successfully",
      donationPool: donationPool
    });
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ message: "Error processing donation", error: error.message });
  }
});

// Stripe webhook to handle payment confirmations
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!');
      // You can add additional logic here if needed
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.last_payment_error?.message);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Get donation pool with all donations
router.get("/pool/:id", authenticateToken, async (req, res) => {
  try {
    const donationPool = await Donations.findById(req.params.id);
    if (!donationPool) {
      return res.status(404).json({ message: "Donation pool not found" });
    }
    res.status(200).json(donationPool);
  } catch (error) {
    res.status(500).json({ message: "Error fetching donation pool", error: error.message });
  }
});

// Get all donation pools
router.get("/all/donation-pools", authenticateToken, async (req, res) => {
  try {
    if (req.user?.role == 'employee') {
      const managerID = req.user?.managerID;
      console.log('req.user', req.user);
      const managerInfo = await User.findById(managerID);
      console.log('managerInfo', managerInfo);

      const donationPools = await Donations.find({ createdBy: 'usman.sajid@tekrowe.com' });
      res.status(200).json(donationPools);
    } else {
      const donationPools = await Donations.find({ createdBy: req.user?.email });
      res.status(200).json(donationPools);
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching donation pools", error: error.message });
  }
});

module.exports = router;