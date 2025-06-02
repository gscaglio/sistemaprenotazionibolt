import { supabase } from '../supabase';
import { notificationService } from '../notifications';
import type { Database } from '../database.types';
import { stripe } from '../stripe';
import toast from 'react-hot-toast';

type Booking = Database['public']['Tables']['bookings']['Row'];

export const bookingsApi = {
  createBooking: async (booking: Omit<Booking, 'id' | 'created_at' | 'status' | 'payment_intent_id'>) => {
    try {
      // Create payment intent first
      const clientSecret = await stripe.createPaymentIntent(booking.total_amount, booking);

      // Create booking with pending status
      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          ...booking,
          status: 'pending',
          payment_intent_id: clientSecret.split('_secret_')[0]
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      return { booking: data, clientSecret };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  confirmBooking: async (id: number) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select('*, rooms(*)')
      .single();

    if (error) throw error;

    try {
      await Promise.all([
        notificationService.sendWhatsAppNotification(data),
        notificationService.sendEmailToOwner(data)
      ]);
    } catch (error) {
      console.error('Failed to send notifications:', error);
      toast.error('Prenotazione confermata ma invio notifiche fallito');
    }

    return data;
  },

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
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  }
};