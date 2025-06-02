import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe@14.18.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      endpointSecret
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        // Update booking status
        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'confirmed',
            payment_method: paymentIntent.payment_method_types[0]
          })
          .eq('payment_intent_id', paymentIntentId);

        if (error) throw error;

        // Trigger notifications
        const { data: booking } = await supabase
          .from('bookings')
          .select('*, rooms(*)')
          .eq('payment_intent_id', paymentIntentId)
          .single();

        if (booking) {
          await supabase.functions.invoke('send-notifications', {
            body: { booking }
          });
        }

        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await supabase
          .from('bookings')
          .update({ 
            status: 'cancelled',
            notes: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`
          })
          .eq('payment_intent_id', paymentIntent.id);
        
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});