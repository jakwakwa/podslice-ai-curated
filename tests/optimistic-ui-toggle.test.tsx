/**
 * Integration tests for the optimistic UI update pattern
 * in episode public/private toggle functionality
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import EpisodeActionsWrapper from "@/components/features/episodes/episode-actions-wrapper";
import type { UserEpisode } from "@/lib/types";

// Mock the audio player store
vi.mock("@/store/audioPlayerStore", () => ({
    useAudioPlayerStore: () => ({
        setEpisode: vi.fn(),
    }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("Optimistic UI Toggle", () => {
    const mockEpisode: UserEpisode = {
        episode_id: "test-episode-123",
        user_id: "test-user-456",
        episode_title: "Test Episode",
        youtube_url: "https://youtube.com/watch?v=test",
        transcript: "Test transcript",
        summary: "Test summary",
        gcs_audio_url: "gs://bucket/audio.mp3",
        is_public: false,
        public_gcs_audio_url: null,
        duration_seconds: 300,
        status: "COMPLETED",
        progress_message: null,
        news_sources: null,
        news_topic: null,
        created_at: new Date("2025-01-01"),
        updated_at: new Date("2025-01-01"),
        summary_length: "MEDIUM",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    it("should immediately update share URL when toggling to public", async () => {
        render(
            <EpisodeActionsWrapper
                episode={mockEpisode}
                signedAudioUrl="https://signed-url.com/audio.mp3"
                isPublic={false}
            />
        );

        // Initially should show Private button
        const toggleButton = screen.getByRole("button", { name: /private/i });
        expect(toggleButton).toBeInTheDocument();

        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ is_public: true }),
        } as Response);

        // Click the toggle button
        fireEvent.click(toggleButton);

        // Button should immediately show Public (optimistic update)
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /public/i })).toBeInTheDocument();
        });

        // Share button should exist
        const shareButton = screen.getByRole("button", { name: /share/i });
        expect(shareButton).toBeInTheDocument();

        // Open share dialog
        fireEvent.click(shareButton);

        // Share URL should immediately reflect the public URL (optimistic update)
        await waitFor(() => {
            const shareInput = screen.getByDisplayValue(/\/shared\/episodes\/test-episode-123/);
            expect(shareInput).toBeInTheDocument();
        });

        // Verify API was called
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/user-episodes/test-episode-123/toggle-public",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("should rollback state when API call fails", async () => {
        const { toast } = await import("sonner");

        render(
            <EpisodeActionsWrapper
                episode={mockEpisode}
                signedAudioUrl="https://signed-url.com/audio.mp3"
                isPublic={false}
            />
        );

        // Initially should show Private button
        const toggleButton = screen.getByRole("button", { name: /private/i });
        expect(toggleButton).toBeInTheDocument();

        // Mock failed API response
        mockFetch.mockResolvedValueOnce({
            ok: false,
            text: async () => "Network error",
        } as Response);

        // Click the toggle button
        fireEvent.click(toggleButton);

        // Button should briefly show Public (optimistic update)
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /public/i })).toBeInTheDocument();
        });

        // After API failure, should revert to Private
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /private/i })).toBeInTheDocument();
        });

        // Error toast should be shown
        expect(toast.error).toHaveBeenCalledWith(
            "Failed to update sharing settings",
            expect.any(Object)
        );
    });

    it("should maintain correct URL when toggling from public to private", async () => {
        const publicEpisode = { ...mockEpisode, is_public: true };

        render(
            <EpisodeActionsWrapper
                episode={publicEpisode}
                signedAudioUrl="https://signed-url.com/audio.mp3"
                isPublic={true}
            />
        );

        // Initially should show Public button
        expect(screen.getByRole("button", { name: /public/i })).toBeInTheDocument();

        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ is_public: false }),
        } as Response);

        // Click the toggle button to make private
        const toggleButton = screen.getByRole("button", { name: /public/i });
        fireEvent.click(toggleButton);

        // Button should immediately show Private (optimistic update)
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /private/i })).toBeInTheDocument();
        });

        // Open share dialog
        const shareButton = screen.getByRole("button", { name: /share/i });
        fireEvent.click(shareButton);

        // Share URL should reflect the private URL (current page URL)
        await waitFor(() => {
            const shareInput = screen.getByDisplayValue(/\/my-episodes\//);
            expect(shareInput).toBeInTheDocument();
        });
    });

    it("should prevent multiple toggles while request is in flight", async () => {
        render(
            <EpisodeActionsWrapper
                episode={mockEpisode}
                signedAudioUrl="https://signed-url.com/audio.mp3"
                isPublic={false}
            />
        );

        // Mock a slow API response
        mockFetch.mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: async () => ({ is_public: true }),
                            } as Response),
                        100
                    )
                )
        );

        const toggleButton = screen.getByRole("button", { name: /private/i });

        // Click multiple times rapidly
        fireEvent.click(toggleButton);
        fireEvent.click(toggleButton);
        fireEvent.click(toggleButton);

        // Should only make one API call
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Button should be disabled during loading
        expect(toggleButton).toBeDisabled();
    });
});

