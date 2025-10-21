"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EpisodeStatusUpdate {
  episodeId: string;
  episodeTitle: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message: string;
  timestamp: string;
}

interface EpisodeStatusTableProps {
  /** Whether to show the table expanded by default */
  defaultExpanded?: boolean;
}

/**
 * EpisodeStatusTable Component
 *
 * Displays real-time streaming updates from Inngest episode generation functions.
 * Shows episode generation progress in a collapsible table with user-friendly status messages.
 */
export function EpisodeStatusTable({
  defaultExpanded = false,
}: EpisodeStatusTableProps) {
  const searchParams = useSearchParams();
  const fromGenerate = searchParams?.get("from") === "generate";

  const [isOpen, setIsOpen] = useState(defaultExpanded || fromGenerate);
  const [episodes, setEpisodes] = useState<Map<string, EpisodeStatusUpdate>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create EventSource for SSE
    const eventSource = new EventSource("/api/episode-status/stream");

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip heartbeat messages
        if (data.type === "heartbeat") {
          return;
        }

        // Update episodes map
        setEpisodes((prev) => {
          const updated = new Map(prev);
          updated.set(data.episodeId, data);
          return updated;
        });

        // Auto-expand when new episode appears
        setIsOpen((prevIsOpen) => {
          if (!prevIsOpen) {
            return true;
          }
          return prevIsOpen;
        });
      } catch (error) {
        console.error("[EPISODE_STATUS_TABLE] Failed to parse update:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []); // Empty dependency array - connection should persist for component lifetime

  // Filter out completed/failed episodes after a delay
  useEffect(() => {
    const interval = setInterval(() => {
      setEpisodes((prev) => {
        const updated = new Map(prev);
        const now = Date.now();

        for (const [id, episode] of updated.entries()) {
          const episodeTime = new Date(episode.timestamp).getTime();
          const isTerminal =
            episode.status === "COMPLETED" || episode.status === "FAILED";

          // Remove completed episodes after 15 seconds (give user time to see success)
          // Remove failed episodes after 30 seconds (give user time to read error)
          const removeAfter = episode.status === "COMPLETED" ? 15000 : 30000;
          if (isTerminal && now - episodeTime > removeAfter) {
            updated.delete(id);
          }
        }

        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const episodeList = Array.from(episodes.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Don't show the component if there are no episodes
  if (episodeList.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-border bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex w-full items-center justify-between p-4 hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400",
                )}
              />
              <h3 className="text-lg font-semibold">
                Episode Generation Status
              </h3>
              <Badge variant="secondary" className="ml-2">
                {episodeList.length > 0} in progress
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Episode</TableHead>
                  <TableHead className="w-[20%]">Status</TableHead>
                  <TableHead className="w-[40%]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {episodeList.map((episode) => (
                  <TableRow
                    key={episode.episodeId}
                    className={cn(
                      "transition-all duration-300",
                      episode.status === "COMPLETED" && "bg-green-500/10",
                      episode.status === "FAILED" && "bg-red-500/10",
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="line-clamp-1">
                          {episode.episodeTitle}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Started{" "}
                          {new Date(episode.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={episode.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            episode.status === "PROCESSING" &&
                              "text-blue-400 font-medium",
                            episode.status === "COMPLETED" &&
                              "text-green-400 font-medium",
                            episode.status === "FAILED" && "text-red-400",
                            episode.status === "PENDING" &&
                              "text-muted-foreground",
                          )}
                        >
                          {episode.message}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * StatusBadge Component
 * Displays the current status with appropriate icon and color
 */
function StatusBadge({ status }: { status: EpisodeStatusUpdate["status"] }) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Clock className="h-3 w-3" />
          Queued
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge variant="default" className="gap-1.5 bg-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Creating
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="default" className="gap-1.5 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive" className="gap-1.5">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
