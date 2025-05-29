import Stripe from 'stripe';

export const stripe = new Stripe('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', {
  apiVersion: '2023-10-16',
});