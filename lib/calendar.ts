/**
 * Google Calendar & iCal URL builder for Flight ILU-16 Anniversary Date
 */

export interface CalendarEventOptions {
  slot: "14:00 to 16:00" | "21:00 to 23:00" | "both" | string;
  destination?: string;
  memory?: string;
  seat?: string;
  guests?: string[];
}

export function getCalendarEventTimes(slot: string): { startUTC: string; endUTC: string; label: string } {
  if (slot.includes("14:00") && !slot.toLowerCase().includes("both")) {
    return {
      startUTC: "20261116T083000Z", // 14:00 IST = 08:30 UTC
      endUTC: "20261116T103000Z",   // 16:00 IST = 10:30 UTC
      label: "14:00 to 16:00 IST (Afternoon Date)"
    };
  }

  if (slot.includes("21:00") && !slot.toLowerCase().includes("both")) {
    return {
      startUTC: "20261116T153000Z", // 21:00 IST = 15:30 UTC
      endUTC: "20261116T173000Z",   // 23:00 IST = 17:30 UTC
      label: "21:00 to 23:00 IST (Late Night Orbit)"
    };
  }

  return getCalendarEventTimes("14:00 to 16:00");
}

export function buildGoogleCalendarUrl({
  slot,
  destination = "A Lifetime of Love",
  memory,
  seat = "Beside me",
  guests = ["vrushabhcr7@gmail.com", "yuktasoni05@gmail.com"]
}: CalendarEventOptions): string {
  const { startUTC, endUTC, label } = getCalendarEventTimes(slot);

  const title = "Flight ILU-16: Our 1st Anniversary Date 💕";
  const details = [
    "✈️ Flight ILU-16: Our Little Universe Anniversary Date",
    `⏰ Reserved Time Slot: ${label}`,
    `📍 First Stop: ${destination}`,
    memory ? `💭 Packed Funniest Memory: “${memory}”` : null,
    "✨ Passenger: Yukku & Sonu",
    `💺 Seat: ${seat}`,
    "🌐 Platform: https://ourlittleuniverse16.vercel.app"
  ]
    .filter(Boolean)
    .join("\n\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startUTC}/${endUTC}`,
    details,
    location: "Our Little Universe 💫",
    add: guests.join(",")
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}


export function buildGoogleCalendarLinks(options: CalendarEventOptions) {
  if (options.slot.toLowerCase().includes("both")) {
    return [
      { label: "Add afternoon date to Google Calendar", href: buildGoogleCalendarUrl({ ...options, slot: "14:00 to 16:00" }) },
      { label: "Add evening date to Google Calendar", href: buildGoogleCalendarUrl({ ...options, slot: "21:00 to 23:00" }) }
    ];
  }
  return [{ label: "Add to Google Calendar", href: buildGoogleCalendarUrl(options) }];
}
