import { loadStripe } from '@stripe/stripe-js';

if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing Stripe publishable key');
}

export const stripe = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);