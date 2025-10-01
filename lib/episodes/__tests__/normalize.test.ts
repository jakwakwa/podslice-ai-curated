import { describe, expect, it } from "vitest";
import type { Episode, UserEpisode } from "@/lib/types";
import {
	getArtworkUrlForEpisode,
	isBundleEpisode,
	isUserEpisode,
	normalizeEpisode,
	normalizeEpisodes,
} from "../normalize";

describe("Episode Normalization Utilities", () => {
	// Mock data
	const mockBundleEpisode: Episode = {
		episode_id: "bundle-123",
		title: "Bundle Episode Title",
		audio_url: "https://example.com/audio.mp3",
		image_url: "https://example.com/image.jpg",
		duration_seconds: 1800,
		published_at: new Date("2024-01-01"),
		created_at: new Date("2024-01-01"),
		updated_at: new Date("2024-01-01"),
		podcast_id: "podcast-1",
		description: "Test description",
		profile_id: null,
	};

	const mockUserEpisode: UserEpisode = {
		episode_id: "user-456",
		episode_title: "User Episode Title",
		gcs_audio_url: "https://example.com/user-audio.mp3",
		duration_seconds: 2400,
		created_at: new Date("2024-01-02"),
		updated_at: new Date("2024-01-02"),
		user_id: "user-1",
		youtube_url: "https://youtube.com/watch?v=123",
		summary: "Test summary",
		transcript: "Test transcript",
		status: "COMPLETED",
	};

	describe("isUserEpisode", () => {
		it("should return true for UserEpisode", () => {
			expect(isUserEpisode(mockUserEpisode)).toBe(true);
		});

		it("should return false for Bundle Episode", () => {
			expect(isUserEpisode(mockBundleEpisode)).toBe(false);
		});
	});

	describe("isBundleEpisode", () => {
		it("should return true for Bundle Episode", () => {
			expect(isBundleEpisode(mockBundleEpisode)).toBe(true);
		});

		it("should return false for UserEpisode", () => {
			expect(isBundleEpisode(mockUserEpisode)).toBe(false);
		});
	});

	describe("normalizeEpisode", () => {
		it("should normalize a Bundle Episode correctly", () => {
			const normalized = normalizeEpisode(mockBundleEpisode);

			expect(normalized).toEqual({
				id: "bundle-123",
				title: "Bundle Episode Title",
				source: "bundle",
				audioUrl: "https://example.com/audio.mp3",
				artworkUrl: "https://example.com/image.jpg",
				durationSeconds: 1800,
				publishedAt: mockBundleEpisode.published_at,
				permalink: "/episodes/bundle-123",
				youtubeUrl: null,
				original: mockBundleEpisode,
			});
		});

		it("should normalize a UserEpisode correctly", () => {
			const normalized = normalizeEpisode(mockUserEpisode);

			expect(normalized).toEqual({
				id: "user-456",
				title: "User Episode Title",
				source: "user",
				audioUrl: "https://example.com/user-audio.mp3",
				artworkUrl: null,
				durationSeconds: 2400,
				publishedAt: mockUserEpisode.created_at,
				permalink: "/my-episodes/user-456",
				youtubeUrl: "https://youtube.com/watch?v=123",
				original: mockUserEpisode,
			});
		});

		it("should handle missing audio_url", () => {
			const episodeWithoutAudio = { ...mockBundleEpisode, audio_url: null };
			const normalized = normalizeEpisode(episodeWithoutAudio);

			expect(normalized.audioUrl).toBeNull();
		});

		it("should handle missing duration", () => {
			const episodeWithoutDuration = { ...mockBundleEpisode, duration_seconds: null };
			const normalized = normalizeEpisode(episodeWithoutDuration);

			expect(normalized.durationSeconds).toBeNull();
		});
	});

	describe("getArtworkUrlForEpisode", () => {
		it("should return image_url for Bundle Episode", () => {
			const artworkUrl = getArtworkUrlForEpisode(mockBundleEpisode);
			expect(artworkUrl).toBe("https://example.com/image.jpg");
		});

		it("should return YouTube channel image for UserEpisode when provided", () => {
			const channelImage = "https://example.com/channel.jpg";
			const artworkUrl = getArtworkUrlForEpisode(mockUserEpisode, channelImage);
			expect(artworkUrl).toBe(channelImage);
		});

		it("should return null for UserEpisode without channel image", () => {
			const artworkUrl = getArtworkUrlForEpisode(mockUserEpisode);
			expect(artworkUrl).toBeNull();
		});

		it("should return null for Bundle Episode without image_url", () => {
			const episodeWithoutImage = { ...mockBundleEpisode, image_url: null };
			const artworkUrl = getArtworkUrlForEpisode(episodeWithoutImage);
			expect(artworkUrl).toBeNull();
		});
	});

	describe("normalizeEpisodes", () => {
		it("should normalize an array of mixed episodes", () => {
			const episodes = [mockBundleEpisode, mockUserEpisode];
			const normalized = normalizeEpisodes(episodes);

			expect(normalized).toHaveLength(2);
			expect(normalized[0].source).toBe("bundle");
			expect(normalized[1].source).toBe("user");
		});

		it("should handle empty array", () => {
			const normalized = normalizeEpisodes([]);
			expect(normalized).toHaveLength(0);
		});
	});
});
