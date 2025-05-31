import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts' // Assuming a shared CORS utility
import { format } from 'https://deno.land/std@0.177.0/datetime/mod.ts';
// Note: Supabase Edge Functions use Deno, so date-fns needs to be available or use Deno's std/datetime

// Define the expected Booking type (adjust based on actual Booking structure)
interface Booking {
  id: string | number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string; // Assuming ISO date string
  check_out: string; // Assuming ISO date string
  room_name: string;
  booking_type: 'single' | 'double'; // Or other relevant types
  adults: number;
  children: number;
  total_amount: number;
  // Add any other fields that are used in notification messages
}

// Helper function to send WhatsApp notification
async function sendWhatsAppNotification(booking: Booking, apiKey: string, phone: string) {
  const checkIn = format(new Date(booking.check_in), 'dd/MM/yyyy');
  const checkOut = format(new Date(booking.check_out), 'dd/MM/yyyy');

  let message = '';
  if (booking.booking_type === 'single') {
    message = `Nuova prenotazione ${booking.guest_name} dal ${checkIn} al ${checkOut} - Stanza: ${booking.room_name} - Tel: ${booking.guest_phone}`;
  } else {
    message = `🚨 PRENOTAZIONE DOPPIA! ${booking.guest_name} dal ${checkIn} al ${checkOut} - ENTRAMBE LE STANZE - Tel: ${booking.guest_phone} - BLOCCA SUBITO SU TUTTE LE OTA!`;
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('CallMeBot API error:', errorText);
      throw new Error(`Failed to send WhatsApp notification: ${response.status} ${errorText}`);
    }
    return { success: true };
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to send Email notification
async function sendEmailToOwner(booking: Booking, apiKey: string) {
  const checkIn = format(new Date(booking.check_in), 'dd/MM/yyyy');
  const checkOut = format(new Date(booking.check_out), 'dd/MM/yyyy');

  const emailHtml = `
    <h2>Dettagli Prenotazione #${booking.id}</h2>
    <table style="border-collapse: collapse; width: 100%;">
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Campo</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Valore</th>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Ospite</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${booking.guest_name}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Email</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${booking.guest_email}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Telefono</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${booking.guest_phone}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Check-in</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${checkIn}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Check-out</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${checkOut}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Tipo</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${booking.booking_type === 'single' ? 'Singola' : 'Doppia'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Stanza</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${booking.room_name}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Ospiti</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${booking.adults} adulti, ${booking.children} bambini</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Importo</td>
        <td style="border: 1px solid #ddd; padding: 8px;">€${booking.total_amount.toFixed(2)}</td>
      </tr>
    </table>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Room in Bloom <info@roominbloom.it>',
        to: 'info.roominbloom@gmail.com', // Consider making this an env variable too
        subject: `Nuova Prenotazione #${booking.id}`,
        html: emailHtml
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email notification: ${response.status} ${errorText}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validate request method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let bookingData: Booking;
  try {
    bookingData = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload', details: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate essential booking data (basic validation)
  if (!bookingData || !bookingData.id || !bookingData.guest_name || !bookingData.check_in) {
    return new Response(JSON.stringify({ error: 'Missing required booking data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Retrieve secrets from environment variables
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const WHATSAPP_PHONE = Deno.env.get('WHATSAPP_PHONE');
  const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY');

  if (!RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY secret');
    // Potentially return an error, or try to send WhatsApp only
  }
  if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) {
    console.error('Missing WHATSAPP_PHONE or WHATSAPP_API_KEY secret(s)');
    // Potentially return an error, or try to send Email only
  }

  let whatsappResult = { success: false, error: 'WhatsApp notification not attempted (missing API key or phone).' };
  let emailResult = { success: false, error: 'Email notification not attempted (missing API key).' };

  // Send notifications
  // We run them sequentially to make it easier to debug and see logs,
  // but they could be run in parallel with Promise.all if preferred.
  if (WHATSAPP_PHONE && WHATSAPP_API_KEY) {
    whatsappResult = await sendWhatsAppNotification(bookingData, WHATSAPP_API_KEY, WHATSAPP_PHONE);
  }

  if (RESEND_API_KEY) {
    emailResult = await sendEmailToOwner(bookingData, RESEND_API_KEY);
  }

  // Consolidate results
  const overallSuccess = whatsappResult.success && emailResult.success;
  const statusCode = overallSuccess ? 200 : 500; // Or 207 for Multi-Status if some succeed and some fail

  return new Response(
    JSON.stringify({
      message: overallSuccess ? 'Notifications sent successfully.' : 'One or more notifications failed.',
      whatsapp_status: whatsappResult,
      email_status: emailResult,
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})

/*
Shared CORS utility (example - create supabase/functions/_shared/cors.ts):
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust for production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
*/
