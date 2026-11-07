/** Demo content for Preview mode. Mirrors public.seed_demo_for in SQL. Every row is labelled as a placeholder. */
export const DEMO: Record<string, Record<string, unknown>[]> = {
  memories: [
    { title: "Demo: where we first met", description: "Placeholder. Tap edit to add the real place, date, and the story of that day.", location_name: "Add the real place", latitude: 20.5937, longitude: 78.9629, memory_date: "2025-11-16", category: "first_meeting", image_paths: [] },
    { title: "Demo: our first date", description: "Placeholder for your first date. Add photos and what you ordered.", location_name: "Add the real place", latitude: 21.2, longitude: 79.6, memory_date: null, category: "first_date", image_paths: [] },
    { title: "Demo: a favourite spot", description: "Placeholder for the place you keep going back to.", location_name: "Add the real place", latitude: 19.8, longitude: 78.1, memory_date: null, category: "favourite_place", image_paths: [] },
    { title: "Demo: somewhere we want to go", description: "A future destination. Pin the real one.", location_name: "Dream destination", latitude: 22.4, longitude: 80.9, memory_date: null, category: "future_destination", image_paths: [] }
  ],
  timeline_events: [
    { title: "The day it all began", description: "Demo text. Replace with how your story started.", event_date: "2025-11-16", category: "firsts" },
    { title: "Demo: first trip together", description: "Placeholder. Add the real date, photos or a voice note.", event_date: "2026-02-14", category: "trips" },
    { title: "Demo: a celebration", description: "Placeholder for a birthday, festival or small win.", event_date: "2026-06-01", category: "celebrations" },
    { title: "Our first anniversary", description: "One year. Edit this once the day arrives.", event_date: "2026-11-16", category: "celebrations" }
  ],
  reasons: [
    { content: "Demo reason: replace me with something only you would notice about them.", is_favourite: false, read_by: [] },
    { content: "Demo reason: the small habit of theirs you secretly love.", is_favourite: false, read_by: [] },
    { content: "Demo reason: a moment when they made a hard day easier.", is_favourite: false, read_by: [] },
    { content: "Demo reason: what their laugh sounds like to you.", is_favourite: false, read_by: [] },
    { content: "Demo reason: something they taught you.", is_favourite: false, read_by: [] }
  ],
  songs: [
    { title: "Demo: the song from our first drive", artist: "Add the artist", memory_note: "Replace with your real song and paste a Spotify or YouTube link.", is_favourite: true },
    { title: "Demo: the one that is always stuck in our heads", artist: "Add the artist", memory_note: "Placeholder.", is_favourite: false }
  ],
  bucket_list: [
    { title: "Demo: watch a sunrise from a hilltop", category: "experiences", notes: "Placeholder goal. Edit or delete.", completed: false },
    { title: "Demo: a trip just for the two of us", category: "places", completed: false },
    { title: "Demo: the restaurant we keep talking about", category: "restaurants", completed: false },
    { title: "Demo: celebrate our second anniversary somewhere new", category: "celebrations", completed: false }
  ],
  letters: [
    { title: "Demo: our anniversary letter", content: "This is a placeholder.\n\nWrite the real letter from the Letters page. Drafts stay private until you publish them.", letter_type: "anniversary", is_draft: false, is_favourite: false }
  ]
};
