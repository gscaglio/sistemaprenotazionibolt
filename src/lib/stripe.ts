import { loadStripe } from '@stripe/stripe-js';
import type { Booking } from '../types';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const stripe = {
  createPaymentIntent: async (amount: number, bookingData: Partial<Booking>) => {
    try {
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-payment-intent',
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'eur',
          metadata: {
            booking_id: bookingData.id?.toString(),
            guest_name: bookingData.guest_name,
            check_in: bookingData.check_in,
            check_out: bookingData.check_out,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const { clientSecret } = await response.json();
      return clientSecret;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  },

  confirmPayment: async (clientSecret: string) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements: await stripe.elements({ clientSecret }),
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
      });

      if (error) throw error;
      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  },

  getPaymentStatus: async (clientSecret: string) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      return paymentIntent?.status;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  },
};