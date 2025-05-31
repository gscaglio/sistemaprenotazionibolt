import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database, Json } from "../../../src/lib/database.types.ts"; // Adjusted path

// Simplified local types if import fails - will remove if ../../../src/lib/database.types.ts works
type NotificationQueueEntry = {
  id: number;
  booking_id: number | null;
  type: "whatsapp" | "email";
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  last_attempt: string | null;
  next_retry: string | null;
  error_message: string | null;
  payload: Json;
  created_at: string;
  sent_at: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  // Deno.exit(1) is not available in Supabase Edge Functions, error will be caught by serve
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

const RESEND_API_KEY = Deno.env.get("VITE_RESEND_API_KEY");
const WHATSAPP_PHONE = Deno.env.get("VITE_WHATSAPP_PHONE");
const WHATSAPP_API_KEY = Deno.env.get("VITE_WHATSAPP_API_KEY");

if (!RESEND_API_KEY || !WHATSAPP_PHONE || !WHATSAPP_API_KEY) {
  console.warn(
    "Missing one or more notification API keys (RESEND, WHATSAPP). Function may not be able to send all notification types."
  );
  // Not throwing an error, as the function might still process other types or just manage queue
}

const MAX_ATTEMPTS = 5;
const PROCESSING_LIMIT = 10; // Number of notifications to process per run

function calculateNextRetry(attempts: number): Date {
  const delaySeconds = Math.pow(2, attempts -1) * 60; // Exponential backoff, starting with 1 minute
  const nextRetryDate = new Date(Date.now() + delaySeconds * 1000);
  return nextRetryDate;
}

serve(async (req) => {
  let processedCount = 0;
  let errorCount = 0;

  try {
    const { data: notifications, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .or(
        `status.eq.pending,and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS},next_retry.lte.${new Date().toISOString()}),and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS},next_retry.is.null)`
      )
      .order("created_at", { ascending: true })
      .limit(PROCESSING_LIMIT);

    if (fetchError) {
      console.error("Error fetching notifications:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notifications", details: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications to process." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    for (const notification of notifications as NotificationQueueEntry[]) { // Cast if direct import fails
      try {
        // 1. Update status to 'processing'
        const { error: updateToProcessingError } = await supabase
          .from("notification_queue")
          .update({
            status: "processing",
            attempts: notification.attempts + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", notification.id);

        if (updateToProcessingError) {
          console.error(`Error updating notification ${notification.id} to processing:`, updateToProcessingError);
          errorCount++;
          continue; // Skip to next notification
        }

        let currentErrorMessage: string | null = null;
        let sentSuccessfully = false;

        try {
          // 2. Send notification based on type
          if (notification.type === "whatsapp") {
            if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) {
              throw new Error("WhatsApp credentials not configured for sending.");
            }
            const payload = notification.payload as { recipientPhone?: string, message?: string }; // Type assertion
            if (!payload.recipientPhone || !payload.message) {
                throw new Error("Missing recipientPhone or message in WhatsApp payload");
            }
            const url = `https://api.callmebot.com/whatsapp.php?phone=${payload.recipientPhone}&text=${encodeURIComponent(payload.message)}&apikey=${WHATSAPP_API_KEY}`;
            const response = await fetch(url, { method: "GET" });
            if (!response.ok) {
              const responseText = await response.text();
              throw new Error(`CallMeBot API Error: ${response.status} ${responseText}`);
            }
            sentSuccessfully = true;
          } else if (notification.type === "email") {
            if (!RESEND_API_KEY) {
              throw new Error("Resend API key not configured for sending.");
            }
            const payload = notification.payload as { to?: string, subject?: string, htmlContent?: string }; // Type assertion
            if (!payload.to || !payload.subject || !payload.htmlContent) {
                throw new Error("Missing to, subject, or htmlContent in Email payload");
            }
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Room in Bloom <info@roominbloom.it>", // Consider making this configurable
                to: payload.to,
                subject: payload.subject,
                html: payload.htmlContent,
              }),
            });
            if (!response.ok) {
              const errorBody = await response.json();
              throw new Error(`Resend API Error: ${response.status} ${JSON.stringify(errorBody)}`);
            }
            sentSuccessfully = true;
          } else {
            throw new Error(`Unsupported notification type: ${notification.type}`);
          }

          // 3. Handle Success
          await supabase
            .from("notification_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", notification.id);
          processedCount++;

        } catch (sendError: any) {
          // 4. Handle Failure
          errorCount++;
          currentErrorMessage = sendError.message || "Unknown send error";
          console.error(`Failed to send notification ${notification.id} (attempt ${notification.attempts + 1}):`, currentErrorMessage);

          const updatePayload: Partial<NotificationQueueEntry> = { // Use partial of the local type
            status: "failed",
            error_message: currentErrorMessage,
          };

          if (notification.attempts + 1 < MAX_ATTEMPTS) {
            updatePayload.next_retry = calculateNextRetry(notification.attempts + 1).toISOString();
          } else {
            console.log(`Notification ${notification.id} reached max attempts (${MAX_ATTEMPTS}). Will not retry.`);
            updatePayload.next_retry = null; // Explicitly set to null or leave as is
          }

          if (notification.attempts + 1 >= 3) {
             console.log(`CRITICAL ALERT: Notification ID ${notification.id} failed ${notification.attempts + 1} times. Error: ${currentErrorMessage}`);
          }

          const { error: updateToFailedError } = await supabase
            .from("notification_queue")
            .update(updatePayload)
            .eq("id", notification.id);

          if (updateToFailedError) {
            console.error(`Error updating notification ${notification.id} to failed status:`, updateToFailedError);
          }
        }
      } catch (innerLoopError: any) {
        errorCount++;
        console.error(`Unexpected error processing notification ${notification.id}:`, innerLoopError.message);
        // Attempt to mark as failed if not already handled
        if (notification.status !== 'failed' && notification.status !== 'sent') {
            try {
                await supabase
                    .from("notification_queue")
                    .update({ status: "failed", error_message: `Outer loop error: ${innerLoopError.message}`, last_attempt: new Date().toISOString() })
                    .eq("id", notification.id);
            } catch (e) {
                console.error(`Failed to mark notification ${notification.id} as failed after outer loop error:`, e);
            }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notification queue processed.",
        processed: processedCount,
        errors: errorCount,
        totalFetched: notifications.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("Main function error:", e);
    return new Response(
        JSON.stringify({ error: "Cron job execution failed", details: e.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// To run locally (for testing, ensure you have a .env file with Supabase credentials)
// deno run --allow-net --allow-env supabase/functions/process-notification-queue/index.ts
// Remember to set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_RESEND_API_KEY, VITE_WHATSAPP_PHONE, VITE_WHATSAPP_API_KEY in your .env or environment
