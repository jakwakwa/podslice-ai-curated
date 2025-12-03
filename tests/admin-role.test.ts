import { auth } from "@clerk/nextjs/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAdmin, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}));

describe("Admin Role Functionality", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("isAdmin", () => {
		it("should return false when user is not authenticated", async () => {
			vi.mocked(auth).mockResolvedValue({ userId: null });

			const result = await isAdmin();

			expect(result).toBe(false);
		});

		it("should return false when user is not found in database", async () => {
			vi.mocked(auth).mockResolvedValue({ userId: "user_123" });
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const result = await isAdmin();

			expect(result).toBe(false);
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { user_id: "user_123" },
				select: { role: true },
			});
		});

		it("should return false when user has USER role", async () => {
			vi.mocked(auth).mockResolvedValue({ userId: "user_123" });
			vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "USER" });

			const result = await isAdmin();

			expect(result).toBe(false);
		});

		it("should return true when user has ADMIN role", async () => {
			vi.mocked(auth).mockResolvedValue({ userId: "admin_123" });
			vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "ADMIN" });

			const result = await isAdmin();

			expect(result).toBe(true);
		});

		it("should return false and log error when database query fails", async () => {
			vi.mocked(auth).mockResolvedValue({ userId: "user_123" });
			vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("Database error"));

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await isAdmin();

			expect(result).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(
				"Error checking admin status:",
				expect.any(Error)
			);
		});
	});

	describe("requireAdmin", () => {
		it("should not throw when user is admin", async () => {
			vi.mocked(auth).mockResolvedValue({ userId: "admin_123" });
			vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "ADMIN" });

			await expect(requireAdmin()).resolves.not.toThrow();
		});

		it("should throw when user is not admin", async () => {
			vi.mocked(auth).mockResolvedValue({ userId: "user_123" });
			vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "USER" });

			await expect(requireAdmin()).rejects.toThrow("Admin access required");
		});
	});
});
