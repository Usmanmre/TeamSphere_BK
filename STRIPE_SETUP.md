# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for the donation system in TeamSphere.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Node.js and npm installed
3. Your TeamSphere backend running

## Step 1: Install Stripe Package

The Stripe package has already been installed. If you need to reinstall:

```bash
npm install stripe
```

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Getting Your Stripe Keys:

1. **Secret Key**: Go to your Stripe Dashboard → Developers → API Keys
2. **Publishable Key**: Found in the same location as the secret key
3. **Webhook Secret**: Create a webhook endpoint in Stripe Dashboard → Developers → Webhooks

## Step 3: Set Up Stripe Webhook

1. Go to your Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/donations/webhook`
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook signing secret and add it to your `.env` file

## Step 4: Update Frontend Configuration

In the frontend example (`public/donation-example.html`), replace:

```javascript
const stripe = Stripe('pk_test_your_publishable_key');
```

With your actual publishable key:

```javascript
const stripe = Stripe('pk_test_actual_key_here');
```

## Step 5: Test the Integration

### Test Card Numbers (Stripe Test Mode):

- **Successful Payment**: `4242 4242 4242 4242`
- **Declined Payment**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test the Flow:

1. Create a donation pool using the API
2. Navigate to the donation page with the pool ID
3. Fill in the form and use a test card number
4. Complete the payment

## API Endpoints

### Create Payment Intent
```
POST /api/donations/create-payment-intent
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "donationPoolId": "pool_id",
  "amount": 50.00,
  "donorName": "John Doe"
}
```

### Process Donation
```
POST /api/donations/process-donation
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "donationPoolId": "pool_id",
  "paymentIntentId": "pi_xxx",
  "amount": 50.00,
  "donorName": "John Doe"
}
```

### Get Donation Pool
```
GET /api/donations/pool/:id
Authorization: Bearer <jwt_token>
```

## Database Schema Updates

The donation model has been updated to include:

- `totalAmount`: Total amount collected
- `currentAmount`: Current amount collected
- `status`: Pool status (active/completed/cancelled)
- `donations`: Array of individual donations with payment details

## Security Considerations

1. **Never expose your secret key** in frontend code
2. **Always verify webhook signatures** (implemented in the webhook handler)
3. **Use HTTPS** in production
4. **Validate payment amounts** on the server side
5. **Store payment intent IDs** for reconciliation

## Error Handling

The system includes comprehensive error handling for:

- Invalid payment intents
- Failed payments
- Network errors
- Authentication errors
- Invalid donation pools

## Production Deployment

1. Switch to Stripe live keys
2. Update webhook endpoint URL
3. Ensure HTTPS is enabled
4. Set up proper logging and monitoring
5. Test with real payment methods

## Support

For Stripe-specific issues, refer to:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)

For application-specific issues, check the server logs and ensure all environment variables are properly configured. 