/**
 * Google Calendar integration (OAuth2, client-side only)
 * Uses Google Identity Services + Calendar API
 */

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let tokenClient: any = null;
let accessToken: string | null = null;

// ─── Load Google APIs ─────────────────────────────────────────────────────────

export async function loadGoogleApis(): Promise<void> {
  await new Promise<void>((resolve) => {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
        resolve();
      });
    };
    document.body.appendChild(script1);
  });

  await new Promise<void>((resolve) => {
    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => resolve();
    document.body.appendChild(script2);
  });
}

// ─── Authorize ───────────────────────────────────────────────────────────────

export async function authorizeCalendar(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (response: any) => {
          if (response.error) {
            reject(response.error);
          } else {
            accessToken = response.access_token;
            resolve(response.access_token);
          }
        },
      });
    }
    tokenClient.requestAccessToken();
  });
}

export function isAuthorized(): boolean {
  return !!accessToken;
}

// ─── Calendar Events ─────────────────────────────────────────────────────────

export interface CalendarEventData {
  summary: string;
  description: string;
  date: string;      // "2025-04-15"
  time: string;      // "14:00"
  durationHours?: number;
  calendarId?: string;
}

export async function addCalendarEvent(
  data: CalendarEventData
): Promise<string | null> {
  if (!accessToken) return null;

  const calendarId = data.calendarId || 'primary';
  const startDateTime = `${data.date}T${data.time}:00`;
  const durationMs = (data.durationHours || 1) * 60 * 60 * 1000;
  const endDate = new Date(new Date(startDateTime).getTime() + durationMs);
  const endDateTime = endDate.toISOString().slice(0, 19);

  const event = {
    summary: data.summary,
    description: data.description,
    start: { dateTime: startDateTime, timeZone: 'Europe/Riga' },
    end: { dateTime: endDateTime, timeZone: 'Europe/Riga' },
  };

  const response = await window.gapi.client.calendar.events.insert({
    calendarId,
    resource: event,
  });

  return response.result.id || null;
}

export async function deleteCalendarEvent(
  eventId: string,
  calendarId = 'primary'
): Promise<void> {
  if (!accessToken) return;
  await window.gapi.client.calendar.events.delete({ calendarId, eventId });
}
