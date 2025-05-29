import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Booking } from '../types';

class NotificationService {
  private RESEND_API_KEY = 're_RMtRoheL_7gfdkMse8rxxyayiNDThUrRZ';
  private WHATSAPP_PHONE = '+393487925668';
  private WHATSAPP_API_KEY = '1967589';

  async sendWhatsAppNotification(booking: Booking) {
    const checkIn = format(new Date(booking.check_in), 'dd/MM/yyyy', { locale: it });
    const checkOut = format(new Date(booking.check_out), 'dd/MM/yyyy', { locale: it });
    
    let message = '';
    if (booking.booking_type === 'single') {
      message = `Nuova prenotazione ${booking.guest_name} dal ${checkIn} al ${checkOut} - Stanza: ${booking.room_name} - Tel: ${booking.guest_phone}`;
    } else {
      message = `🚨 PRENOTAZIONE DOPPIA! ${booking.guest_name} dal ${checkIn} al ${checkOut} - ENTRAMBE LE STANZE - Tel: ${booking.guest_phone} - BLOCCA SUBITO SU TUTTE LE OTA!`;
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${this.WHATSAPP_PHONE}&text=${encodeURIComponent(message)}&apikey=${this.WHATSAPP_API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to send WhatsApp notification');
      }
    } catch (error) {
      console.error('WhatsApp notification error:', error);
      throw error;
    }
  }

  async sendEmailToOwner(booking: Booking) {
    const checkIn = format(new Date(booking.check_in), 'dd/MM/yyyy', { locale: it });
    const checkOut = format(new Date(booking.check_out), 'dd/MM/yyyy', { locale: it });

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
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Room in Bloom <info@roominbloom.it>',
          to: 'info.roominbloom@gmail.com',
          subject: `Nuova Prenotazione #${booking.id}`,
          html: emailHtml
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email notification');
      }
    } catch (error) {
      console.error('Email notification error:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();