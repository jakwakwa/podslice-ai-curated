import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import EpisodeHeader from "@/components/features/episodes/episode-header";
import EpisodeShell from "@/components/features/episodes/episode-shell";
import KeyTakeaways from "@/components/features/episodes/key-takeaways";
import PlayAndShare from "@/components/features/episodes/play-and-share";
import { Separator } from "@/components/ui/separator";
import { getStorageReader, parseGcsUri } from "@/lib/inngest/utils/gcs";
import { extractKeyTakeaways } from "@/lib/markdown/episode-text";
import { prisma } from "@/lib/prisma";
import type { Episode } from "@/lib/types";

export const dynamic = "force-dynamic";

const EpisodeSchema = z.object({
  episode_id: z.string(),
  podcast_id: z.string(),
  bundle_id: z.string().nullable().optional(),
  profile_id: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  audio_url: z.string(),
  image_url: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  published_at: z.date().nullable().optional(),
  created_at: z.date(),
  week_nr: z.date().nullable().optional(),
});

type EpisodeWithSigned = Episode & { signedAudioUrl: string | null };

function extractGcsFromHttp(url: string): { bucket: string; object: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname === "storage.googleapis.com" || u.hostname === "storage.cloud.google.com") {
      const path = u.pathname.replace(/^\//, "");
      const slash = path.indexOf("/");
      if (slash > 0) {
        const bucket = path.slice(0, slash);
        const object = path.slice(slash + 1);
        return { bucket, object };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function getEpisodeWithAccess(id: string, currentUserId: string): Promise<EpisodeWithSigned | null> {
  const episode = await prisma.episode.findUnique({
    where: { episode_id: id },
    include: { userProfile: { select: { user_id: true } }, podcast: true },
  });
  if (!episode) return null;

  // Authorization: owned by user or included in user's active bundle
  const profile = await prisma.userCurationProfile.findFirst({
    where: { user_id: currentUserId, is_active: true },
    include: { selectedBundle: { include: { bundle_podcast: true } } },
  });
  const podcastIdsInSelectedBundle = profile?.selectedBundle?.bundle_podcast.map(bp => bp.podcast_id) ?? [];
  const selectedBundleId = profile?.selectedBundle?.bundle_id ?? null;

  const isOwnedByUser = episode.userProfile?.user_id === currentUserId;
  const isInSelectedBundleByPodcast = podcastIdsInSelectedBundle.includes(episode.podcast_id);
  const isDirectlyLinkedToSelectedBundle = !!selectedBundleId && episode.bundle_id === selectedBundleId;
  const authorized = isOwnedByUser || isInSelectedBundleByPodcast || isDirectlyLinkedToSelectedBundle;
  if (!authorized) return null;

  let signedAudioUrl: string | null = null;
  const parsedGs = parseGcsUri(episode.audio_url);
  const parsedHttp = parsedGs ? null : extractGcsFromHttp(episode.audio_url);
  if (parsedGs || parsedHttp) {
    const { bucket, object } = parsedGs ?? parsedHttp!;
    const reader = getStorageReader();
    try {
      const [url] = await reader
        .bucket(bucket)
        .file(object)
        .getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });
      signedAudioUrl = url;
    } catch {
      // avoid logging sensitive info
    }
  }

  const safe = EpisodeSchema.parse(episode) as Episode;
  return { ...safe, signedAudioUrl };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return { title: "Episode" };
  const ep = await getEpisodeWithAccess(id, userId);
  if (!ep) return { title: "Episode not found" };
  return { title: ep.title, description: ep.description ?? undefined };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) notFound();
  const episode = await getEpisodeWithAccess(id, userId);
  if (!episode) notFound();

  const takeaways = extractKeyTakeaways(episode.description);

  return (
    <EpisodeShell>
      <div>
        <EpisodeHeader
          title={episode.title}
          createdAt={episode.created_at}
          durationSeconds={episode.duration_seconds ?? null}
          metaBadges={null}
          rightLink={{ href: "/episodes", label: "Back to Episodes", external: false }}
        />
        <div className="mt-4 mb-4">
          <PlayAndShare kind="curated" episode={episode} signedAudioUrl={episode.signedAudioUrl} />
        </div>
        <div className="mt-4 my-8">
          <Separator className="my-8" />
          <KeyTakeaways items={takeaways} />
        </div>
      </div>
    </EpisodeShell>
  );
}
