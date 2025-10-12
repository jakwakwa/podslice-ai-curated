"use client";

import { Globe, Lock } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PublicToggleButtonProps {
  episodeId: string;
  initialIsPublic: boolean;
  onToggleSuccess?: (isPublic: boolean) => void;
}

export default function PublicToggleButton({
  episodeId,
  initialIsPublic,
  onToggleSuccess,
}: PublicToggleButtonProps): React.ReactElement {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user-episodes/${episodeId}/toggle-public`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      setIsPublic(data.is_public);
      onToggleSuccess?.(data.is_public);

      toast.success(data.is_public ? "Episode is now public" : "Episode is now private", {
        description: data.is_public
          ? "Anyone with the link can listen to this episode"
          : "Only you can access this episode",
      });
    } catch (error) {
      console.error("[PUBLIC_TOGGLE]", error);
      toast.error("Failed to update sharing settings", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  }, [episodeId, onToggleSuccess]);

  return (
    <Button
      type="button"
      variant={isPublic ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      icon={isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
    >
      {isLoading ? "Updating..." : isPublic ? "Public" : "Private"}
    </Button>
  );
}

