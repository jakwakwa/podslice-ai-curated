"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createAssetSchema = z.object({
	userId: z.string(),
	sourceUrl: z.string().url(),
	title: z.string().min(1),
	assetType: z.string(),
	description: z.string().optional(),
	tags: z.string().optional(), // Comma separated string from frontend
});

export async function saveResearchAsset(formData: FormData) {
	const rawData = {
		userId: formData.get("userId"),
		sourceUrl: formData.get("sourceUrl"),
		title: formData.get("title"),
		assetType: formData.get("assetType"),
		description: formData.get("description"),
		tags: formData.get("tags"),
	};

	const validation = createAssetSchema.safeParse(rawData);

	if (!validation.success) {
		return { error: "Invalid data", details: validation.error.flatten() };
	}

	const { userId, sourceUrl, title, assetType, description, tags } = validation.data;

	// Process tags
	const tagsArray = tags
		? tags
				.split(",")
				.map(t => t.trim())
				.filter(t => t.length > 0)
		: [];

	try {
		// Basic "caching" - in real app, fetch content here
		const cachedContent = `Content from ${sourceUrl}`;

		const asset = await prisma.researchAsset.create({
			data: {
				userId,
				sourceUrl,
				title,
				assetType,
				description,
				tags: tagsArray,
				cachedContent,
			},
		});

		revalidatePath("/research-vault"); // Assuming a page exists, or just general
		return { success: true, asset };
	} catch (error) {
		console.error("Failed to save asset:", error);
		return { error: "Failed to save asset to database." };
	}
}

import { auth } from "@clerk/nextjs/server";

export async function getUserAssets() {
	const { userId } = await auth();
	if (!userId) return [];

	try {
		const assets = await prisma.researchAsset.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				title: true,
				assetType: true,
				sourceUrl: true,
				createdAt: true,
			},
		});
		return assets;
	} catch (error) {
		console.error("Failed to fetch user assets:", error);
		return [];
	}
}
