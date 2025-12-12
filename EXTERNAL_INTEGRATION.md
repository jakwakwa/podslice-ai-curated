# External App Integration Guide

Use the following TypeScript function in your B2B app to sync episodes to Podslice.

## Prerequisites

1.  Ensure you have the `EXTERNAL_API_SECRET` configured in your Podslice environment variables.
2.  Use the same secret when calling this function.

## Integration Code

```typescript
/**
 * Syncs a podcast episode to the Podslice platform.
 *
 * @param apiSecret - The EXTERNAL_API_SECRET from Podslice.
 * @param podsliceUrl - The base URL of the Podslice instance (e.g., https://podslice.ai).
 * @param podcastData - Data about the podcast.
 * @param episodeData - Data about the episode.
 * @param vercelBypassSecret - Optional: The Vercel "Protection Bypass for Automation" secret (x-vercel-protection-bypass).
 */
export async function syncToPodslice(
  apiSecret: string,
  podsliceUrl: string,
  podcastData: {
    name: string;
    url: string; // The canonical URL of the podcast (e.g., YouTube channel URL or website)
    imageUrl?: string;
    description?: string;
  },
  episodeData: {
    videoUrl: string; // The YouTube URL or source URL of the episode
    transcript: string; // The full transcript text
    title?: string;
    description?: string;
    imageUrl?: string; // Specific image for this episode
  },
  vercelBypassSecret?: string
) {
  const endpoint = `${podsliceUrl}/api/external/sync-episode`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiSecret}`,
  };

  if (vercelBypassSecret) {
    headers["x-vercel-protection-bypass"] = vercelBypassSecret;
  }
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        podcast: podcastData,
        episode: episodeData,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // Only log the first 200 chars of HTML responses to avoid clutter
      const displayError = errorBody.startsWith("<") ? errorBody.substring(0, 200) + "..." : errorBody;
      throw new Error(`Podslice Sync Failed: ${response.status} ${response.statusText} - ${displayError}`);
    }

    const result = await response.json();
    return result; // { success: true, podcastId: "...", eventId: "..." }
  } catch (error) {
    console.error("Error syncing to Podslice:", error);
    throw error;
  }
}
```

## Example Usage

```typescript
await syncToPodslice(
  process.env.PODSLICE_API_SECRET,
  "https://podslice-ai-synthesis-staged.vercel.app", // Your staging URL
  {
    name: "My Awesome Podcast",
    url: "https://youtube.com/@awesomepodcast",
    imageUrl: "https://example.com/podcast-cover.jpg",
  },
  {
    videoUrl: "https://youtube.com/watch?v=12345",
    transcript: "Full transcript content goes here...",
    title: "Episode 1: The Beginning",
  },
  process.env.VERCEL_BYPASS_SECRET // Optional: Add this env var if using Vercel staging protection
);
```

