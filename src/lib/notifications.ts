import { supabase } from './supabase'; // Ensure this path is correct
import type { Booking } from '../types'; // Ensure this path and type are correct

// Define a type for the expected response from the Edge Function
interface NotificationEdgeResponse {
  message: string;
  whatsapp_status: { success: boolean; error?: string };
  email_status: { success: boolean; error?: string };
}

export async function sendNotificationsEdge(booking: Booking): Promise<NotificationEdgeResponse> {
  if (!booking) {
    console.error('sendNotificationsEdge: Booking data is missing.');
    // Return a structured error response consistent with the Edge Function's possible errors
    return {
      message: 'Client-side error: Booking data is missing.',
      whatsapp_status: { success: false, error: 'Booking data missing' },
      email_status: { success: false, error: 'Booking data missing' },
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: booking,
    });

    if (error) {
      console.error('Error invoking send-notifications Edge Function:', error.message);
      // Construct a response that indicates a function invocation error
      return {
        message: `Edge Function invocation failed: ${error.message}`,
        whatsapp_status: { success: false, error: `Edge Function error: ${error.message}` },
        email_status: { success: false, error: `Edge Function error: ${error.message}` },
      };
    }

    // Assuming 'data' is the JSON response from the Edge Function
    // It should match NotificationEdgeResponse structure
    if (data && (data.whatsapp_status || data.email_status)) {
      console.log('send-notifications Edge Function response:', data);
      if (!data.whatsapp_status.success) {
        console.warn('WhatsApp notification failed:', data.whatsapp_status.error);
      }
      if (!data.email_status.success) {
        console.warn('Email notification failed:', data.email_status.error);
      }
      return data as NotificationEdgeResponse;
    } else {
      // Handle unexpected response structure from Edge Function
      console.error('Unexpected response structure from send-notifications Edge Function:', data);
      return {
        message: 'Unexpected response from Edge Function.',
        whatsapp_status: { success: false, error: 'Unexpected response structure' },
        email_status: { success: false, error: 'Unexpected response structure' },
      };
    }

  } catch (e) {
    // Catch any other unexpected errors during the process
    console.error('Client-side error in sendNotificationsEdge:', e);
    return {
      message: `Client-side exception: ${e.message}`,
      whatsapp_status: { success: false, error: `Client-side exception: ${e.message}` },
      email_status: { success: false, error: `Client-side exception: ${e.message}` },
    };
  }
}