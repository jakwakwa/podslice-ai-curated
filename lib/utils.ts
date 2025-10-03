import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Timeout wrapper for Vercel functions to prevent hitting the 300s limit
 * @param promise The promise to wrap with timeout
 * @param timeoutMs Timeout in milliseconds (default 280s to leave buffer)
 * @param errorMessage Custom error message for timeout
 */
export function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number = 280000, // 280 seconds (20s buffer before Vercel's 300s limit)
	errorMessage: string = "Operation timed out"
): Promise<T> {
	return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs))]);
}

/**
 * Wrapper for database operations with shorter timeout
 * @param promise Database operation promise
 * @param timeoutMs Timeout in milliseconds (default 30s)
 */
export function withDatabaseTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number = 30000 // 30 seconds for database operations
): Promise<T> {
	return withTimeout(promise, timeoutMs, "Database operation timed out");
}

/**
 * Wrapper for file upload operations with medium timeout
 * @param promise File upload promise
 * @param timeoutMs Timeout in milliseconds (default 120s)
 */
export function withUploadTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number = 120000 // 2 minutes for file uploads
): Promise<T> {
	return withTimeout(promise, timeoutMs, "File upload timed out");
}
