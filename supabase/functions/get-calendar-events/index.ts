import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENCRYPTION_KEY = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || "default-key-for-dev";

async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const data = JSON.parse(atob(encryptedToken));
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(data.iv) },
      key,
      new Uint8Array(data.data)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return encryptedToken;
  }
}

async function encryptToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );
  return btoa(JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  }));
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("[get-calendar-events] Missing Google OAuth credentials");
    return null;
  }

  console.log("[get-calendar-events] Attempting to refresh access token...");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[get-calendar-events] Failed to refresh token. Status:", response.status, "Error:", errorText);
    return null;
  }

  console.log("[get-calendar-events] Token refreshed successfully");
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's Google tokens
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_access_token, google_refresh_token, google_token_expires_at, google_calendar_connected")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.google_calendar_connected || !profile.google_access_token) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected", events: [], needsReconnect: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = await decryptToken(profile.google_access_token);

    // Check if token is expired and refresh if needed
    const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null;
    if (expiresAt && expiresAt < new Date()) {
      console.log("[get-calendar-events] Token expired, attempting refresh...");
      
      if (!profile.google_refresh_token) {
        console.error("[get-calendar-events] No refresh token available - forcing reconnect");
        // Force disconnect to allow clean reconnection
        await supabase
          .from("profiles")
          .update({
            google_calendar_connected: false,
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
          })
          .eq("id", user.id);
          
        return new Response(JSON.stringify({ 
          error: "Token expired and no refresh token. Please reconnect.", 
          events: [], 
          needsReconnect: true 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refreshToken = await decryptToken(profile.google_refresh_token);
      const newTokens = await refreshAccessToken(refreshToken);

      if (!newTokens) {
        console.error("[get-calendar-events] Token refresh failed - forcing reconnect");
        // Force disconnect to allow clean reconnection
        await supabase
          .from("profiles")
          .update({
            google_calendar_connected: false,
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
          })
          .eq("id", user.id);
          
        return new Response(JSON.stringify({ 
          error: "Failed to refresh token. Please reconnect.", 
          events: [], 
          needsReconnect: true 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = newTokens.access_token;
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
      const encryptedToken = await encryptToken(newTokens.access_token);

      await supabase
        .from("profiles")
        .update({
          google_access_token: encryptedToken,
          google_token_expires_at: newExpiresAt,
        })
        .eq("id", user.id);
        
      console.log("[get-calendar-events] Token successfully refreshed and saved");
    }

    // Parse request body for date range
    const body = await req.json().catch(() => ({}));
    const timeMin = body.timeMin || new Date().toISOString();
    const timeMax = body.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

    console.log("[get-calendar-events] Fetching events from", timeMin, "to", timeMax);

    // Fetch events from Google Calendar with pagination
    const MAX_RESULTS_PER_PAGE = 2500; // Maximum allowed by Google API
    const MAX_PAGES = 4; // Safety limit: 4 pages × 2500 = 10,000 events max
    let allEvents: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;

    do {
      const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      calendarUrl.searchParams.set("timeMin", timeMin);
      calendarUrl.searchParams.set("timeMax", timeMax);
      calendarUrl.searchParams.set("singleEvents", "true");
      calendarUrl.searchParams.set("orderBy", "startTime");
      calendarUrl.searchParams.set("maxResults", MAX_RESULTS_PER_PAGE.toString());
      
      if (pageToken) {
        calendarUrl.searchParams.set("pageToken", pageToken);
      }

      const calendarResponse = await fetch(calendarUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error("[get-calendar-events] Google Calendar API error:", errorText);
        
        // Check if it's an auth error (401) - needs reconnection
        if (calendarResponse.status === 401) {
          console.error("[get-calendar-events] 401 Unauthorized - forcing reconnect");
          // Force disconnect to allow clean reconnection
          await supabase
            .from("profiles")
            .update({
              google_calendar_connected: false,
              google_access_token: null,
              google_refresh_token: null,
              google_token_expires_at: null,
            })
            .eq("id", user.id);
            
          return new Response(JSON.stringify({ 
            error: "Authentication failed. Please reconnect Google Calendar.", 
            events: [], 
            needsReconnect: true 
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ error: "Failed to fetch calendar events", events: [], needsReconnect: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const calendarData = await calendarResponse.json();
      const pageEvents = calendarData.items || [];
      allEvents = [...allEvents, ...pageEvents];
      pageToken = calendarData.nextPageToken || null;
      pageCount++;
      
      console.log(`[get-calendar-events] Page ${pageCount}: ${pageEvents.length} events fetched`);
    } while (pageToken && pageCount < MAX_PAGES);

    console.log(`[get-calendar-events] Total events fetched: ${allEvents.length} (${pageCount} page(s))`);
    
    // Get synced task google_event_ids to identify which events came from our system
    const { data: syncedTasks } = await supabase
      .from("tasks")
      .select("google_event_id")
      .eq("created_by", user.id)
      .not("google_event_id", "is", null);

    const syncedEventIds = new Set(syncedTasks?.map(t => t.google_event_id) || []);

    // Transform events to a standard format - include ALL events now
    const events = allEvents
      .map((event: any) => ({
        id: event.id,
        title: event.summary || "Sem título",
        description: event.description || "",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start?.dateTime,
        location: event.location || "",
        meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || "",
        attendees: event.attendees?.map((a: any) => a.email) || [],
        isFromSystem: syncedEventIds.has(event.id), // Mark if it came from our system
      }));

    return new Response(JSON.stringify({ events }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-calendar-events:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage, events: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});