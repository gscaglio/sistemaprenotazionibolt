import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY')!;
const whatsappPhone = Deno.env.get('WHATSAPP_PHONE')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const { error } = await req.json();

    if (!error || error.level !== 'critical') {
      return new Response(JSON.stringify({ message: 'Notification skipped' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get error count in last hour
    const hourAgo = new Date();
    hourAgo.setHours(hourAgo.getHours() - 1);

    const { count } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('level', error.level)
      .gte('created_at', hourAgo.toISOString());

    // Only notify if error is critical or there are multiple occurrences
    if (error.level === 'critical' || count > 5) {
      const message = `🚨 ERRORE ${error.level.toUpperCase()}: ${error.message}\n` +
        `${count} occorrenze nell'ultima ora\n` +
        `URL: ${error.context?.url || 'N/A'}\n` +
        `Stack: ${error.error_stack?.split('\n')[0] || 'N/A'}`;

      const whatsappUrl = `https://api.callmebot.com/whatsapp.php?` +
        `phone=${whatsappPhone}&text=${encodeURIComponent(message)}&apikey=${whatsappApiKey}`;

      const response = await fetch(whatsappUrl);
      if (!response.ok) {
        throw new Error('Failed to send WhatsApp notification');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});