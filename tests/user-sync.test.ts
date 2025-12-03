import { auth, currentUser } from "@clerk/nextjs/server";
import type { User as PrismaUser } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/sync-user/route";
import { prisma } from "../lib/prisma";

type AuthReturn = Awaited<ReturnType<typeof auth>>;
type CurrentUserReturn = Awaited<ReturnType<typeof currentUser>>;

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn(),
	currentUser: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			update: vi.fn(),
			create: vi.fn(),
		},
	},
}));

// Mock Clerk user type
interface MockClerkUser {
	fullName?: string;
	firstName?: string;
	emailAddresses: Array<{
		emailAddress: string;
		verification?: { status: string };
	}>;
	imageUrl?: string | null;
}

describe("User Sync API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("POST /api/sync-user", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(auth).mockResolvedValue({
				userId: null,
			} as unknown as AuthReturn);

			const response = await POST();
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Not authenticated");
		});

		it("should return 404 when user is not found in Clerk", async () => {
			vi.mocked(auth).mockResolvedValue({
				userId: "user_123",
			} as unknown as AuthReturn);
			vi.mocked(currentUser).mockResolvedValue(null as unknown as CurrentUserReturn);

			const response = await POST();
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("User not found in Clerk");
		});

		it("should update existing user when found by Clerk ID", async () => {
			const mockClerkUser: MockClerkUser = {
				fullName: "John Doe",
				firstName: "John",
				emailAddresses: [
					{
						emailAddress: "john@example.com",
						verification: { status: "verified" },
					},
				],
				imageUrl: "https://example.com/avatar.jpg",
			};
			const mockExistingUser: Partial<PrismaUser> = {
				user_id: "user_123",
				email: "old@example.com",
				name: "Old Name",
			};
			const mockUpdatedUser: Partial<PrismaUser> = {
				...mockExistingUser,
				email: "john@example.com",
				name: "John Doe",
			};

			vi.mocked(auth).mockResolvedValue({
				userId: "user_123",
			} as unknown as AuthReturn);
			vi.mocked(currentUser).mockResolvedValue(
				mockClerkUser as unknown as CurrentUserReturn
			);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockExistingUser as PrismaUser);
			vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser as PrismaUser);

			const response = await POST();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("User updated successfully");
			expect(data.isNew).toBe(false);
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { user_id: "user_123" },
			});
			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { user_id: "user_123" },
				data: {
					name: "John Doe",
					email: "john@example.com",
					image: "https://example.com/avatar.jpg",
					email_verified: expect.any(Date),
					updated_at: expect.any(Date),
				},
			});
		});

		it("should create new user when not found by Clerk ID", async () => {
			const mockClerkUser: MockClerkUser = {
				fullName: "Jane Doe",
				firstName: "Jane",
				emailAddresses: [
					{
						emailAddress: "jane@example.com",
						verification: { status: "verified" },
					},
				],
				imageUrl: "https://example.com/avatar.jpg",
			};
			const mockNewUser: Partial<PrismaUser> = {
				user_id: "user_456",
				email: "jane@example.com",
				name: "Jane Doe",
			};

			vi.mocked(auth).mockResolvedValue({
				userId: "user_456",
			} as unknown as AuthReturn);
			vi.mocked(currentUser).mockResolvedValue(
				mockClerkUser as unknown as CurrentUserReturn
			);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
			vi.mocked(prisma.user.create).mockResolvedValue(mockNewUser as PrismaUser);

			const response = await POST();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("User created successfully");
			expect(data.isNew).toBe(true);
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					user_id: "user_456",
					name: "Jane Doe",
					email: "jane@example.com",
					password: "clerk_managed",
					image: "https://example.com/avatar.jpg",
					email_verified: expect.any(Date),
					updated_at: expect.any(Date),
				},
			});
		});

		it("should handle user creation error gracefully", async () => {
			const mockClerkUser: MockClerkUser = {
				fullName: "Error User",
				firstName: "Error",
				emailAddresses: [{ emailAddress: "error@example.com" }],
				imageUrl: null,
			};

			vi.mocked(auth).mockResolvedValue({
				userId: "user_error",
			} as unknown as AuthReturn);
			vi.mocked(currentUser).mockResolvedValue(
				mockClerkUser as unknown as CurrentUserReturn
			);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
			vi.mocked(prisma.user.create).mockRejectedValue(new Error("Database error"));

			const response = await POST();
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Failed to create user");
		});

		it("should handle general errors gracefully", async () => {
			vi.mocked(auth).mockRejectedValue(new Error("Auth error"));

			const response = await POST();
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Failed to sync user");
		});
	});
});
