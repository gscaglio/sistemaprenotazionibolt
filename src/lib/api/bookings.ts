import { supabase } from '../supabase';
import { stripe } from '../stripe';
import { sendNotificationsEdge } from '../notifications';
import type { Database } from '../database.types';

type Booking = Database['public']['Tables']['bookings']['Row'];

export const bookingsApi = {
  // Public endpoints
  createBooking: async (booking: Omit<Booking, 'id' | 'created_at' | 'status' | 'payment_intent_id'>) => {
    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_amount * 100),
      currency: 'eur',
      payment_method_types: ['card'],
      metadata: {
        booking_type: booking.booking_type,
        check_in: booking.check_in,
        check_out: booking.check_out
      }
    });

    // Create booking with payment intent
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        ...booking,
        status: 'pending',
        payment_intent_id: paymentIntent.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { booking: data, clientSecret: paymentIntent.client_secret };
  },

  confirmBooking: async (paymentIntentId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('payment_intent_id', paymentIntentId)
      .select('*, rooms(*)')
      .single();

    if (error) throw error;

    // Send notifications via Edge Function
    try {
      const notificationResult = await sendNotificationsEdge(data);
      if (!notificationResult.whatsapp_status.success || !notificationResult.email_status.success) {
        console.warn('One or more notifications failed. Full status:', notificationResult);
      } else {
        console.log('Notifications sent successfully via Edge Function:', notificationResult);
      }
    } catch (error) {
      // This catch block is for unexpected errors in sendNotificationsEdge itself,
      // or if sendNotificationsEdge throws an error before returning a structured response.
      console.error('Failed to invoke notification Edge Function or unexpected client-side error:', error);
      // Continue even if notifications fail
    }

    return data;
  },

  // Admin endpoints
  getAllBookings: async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(*)')
      .order('check_in', { ascending: false });
    if (error) throw error;
    return data;
  },

  getBooking: async (id: number) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  updateBooking: async (id: number, updates: Partial<Booking>) => {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  cancelBooking: async (id: number) => {
    const { data: booking } = await supabase
      .from('bookings')
      .select('payment_intent_id')
      .eq('id', id)
      .single();

    if (booking?.payment_intent_id) {
      await stripe.paymentIntents.cancel(booking.payment_intent_id);
    }

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  }
};