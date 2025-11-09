"use client";

import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	ExternalLink,
	Play,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type CronJob = {
	name: string;
	path: string;
	schedule: string;
	description: string;
	estimatedDuration?: string;
};

type ExecutionResult = {
	success: boolean;
	data?: any;
	error?: string;
	timestamp: Date;
	duration?: number;
	statusCode?: number;
};

const CRON_JOBS: CronJob[] = [
	{
		name: "YouTube Feed Sync",
		path: "/api/cron/youtube-feed",
		schedule: "Daily at midnight UTC (0 8 * * *)",
		description:
			"Fetches new YouTube videos from user RSS feeds and stores them for processing",
		estimatedDuration: "~30-60 seconds",
	},
	{
		name: "Generate Auto Episodes",
		path: "/api/cron/generate-episodes",
		schedule: "Daily at 12:30 AM UTC (30 8 * * *)",
		description:
			"Auto-generates episodes from the latest unprocessed YouTube videos for Curate Control users",
		estimatedDuration: "~10-30 seconds",
	},
];

export default function CronMonitorClient() {
	const [loading, setLoading] = useState<string | null>(null);
	const [results, setResults] = useState<Record<string, ExecutionResult>>({});

	const triggerCron = async (path: string) => {
		setLoading(path);
		const startTime = Date.now();

		try {
			const response = await fetch(path, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			const duration = Date.now() - startTime;
			const data = await response.json();

			setResults(prev => ({
				...prev,
				[path]: {
					success: response.ok,
					data,
					timestamp: new Date(),
					duration,
					statusCode: response.status,
				},
			}));
		} catch (error) {
			const duration = Date.now() - startTime;
			setResults(prev => ({
				...prev,
				[path]: {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
					timestamp: new Date(),
					duration,
				},
			}));
		} finally {
			setLoading(null);
		}
	};

	const formatDuration = (ms: number) => {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	};

	const getStatusIcon = (result: ExecutionResult) => {
		if (result.success) {
			return <CheckCircle2 className="h-5 w-5 text-green-600" />;
		}
		return <XCircle className="h-5 w-5 text-red-600" />;
	};

	const getStatusBadge = (result: ExecutionResult) => {
		if (result.success) {
			return (
				<Badge variant="default" className="bg-green-600">
					Success
				</Badge>
			);
		}
		return <Badge variant="destructive">Failed</Badge>;
	};

	return (
		<div className="space-y-6">
			{/* Info Alert */}
			<Alert>
				<AlertTriangle className="h-4 w-4" />
				<AlertTitle>Testing Environment</AlertTitle>
				<AlertDescription>
					These cron jobs will run against your current environment (preview or
					production). Make sure you understand the impact before triggering them.
				</AlertDescription>
			</Alert>

			{/* Cron Jobs */}
			{CRON_JOBS.map(job => {
				const result = results[job.path];
				const isLoading = loading === job.path;

				return (
					<Card key={job.path}>
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="space-y-1 flex-1">
									<div className="flex items-center gap-2">
										<CardTitle>{job.name}</CardTitle>
										{result && getStatusIcon(result)}
									</div>
									<CardDescription>{job.description}</CardDescription>
									<div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											<span>{job.schedule}</span>
										</div>
										{job.estimatedDuration && (
											<span className="text-xs">
												Est. duration: {job.estimatedDuration}
											</span>
										)}
									</div>
									<code className="text-xs text-muted-foreground">{job.path}</code>
								</div>
								<Button
									onClick={() => triggerCron(job.path)}
									disabled={isLoading}
									variant="outline"
									size="lg">
									{isLoading ? (
										<>
											<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
											Running...
										</>
									) : (
										<>
											<Play className="mr-2 h-4 w-4" />
											Trigger Now
										</>
									)}
								</Button>
							</div>
						</CardHeader>

						{result && (
							<CardContent>
								<div className="space-y-4">
									{/* Status Header */}
									<div className="flex items-center justify-between pb-2 border-b">
										<div className="flex items-center gap-3">
											{getStatusBadge(result)}
											{result.statusCode && (
												<Badge variant="outline">HTTP {result.statusCode}</Badge>
											)}
											{result.duration && (
												<Badge variant="outline">{formatDuration(result.duration)}</Badge>
											)}
										</div>
										<span className="text-sm text-muted-foreground">
											{result.timestamp.toLocaleString()}
										</span>
									</div>

									{/* Summary Stats */}
									{result.success && result.data && (
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											{Object.entries(result.data)
												.filter(
													([_key, value]) =>
														typeof value === "number" || typeof value === "boolean"
												)
												.map(([key, value]) => (
													<div key={key} className="space-y-1">
														<p className="text-xs text-muted-foreground capitalize">
															{key.replace(/_/g, " ")}
														</p>
														<p className="text-2xl font-semibold">
															{typeof value === "boolean"
																? value
																	? "✓"
																	: "✗"
																: String(value)}
														</p>
													</div>
												))}
										</div>
									)}

									{/* Full Response */}
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<h4 className="text-sm font-medium">Full Response</h4>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													navigator.clipboard.writeText(
														JSON.stringify(result.data || result.error, null, 2)
													);
												}}>
												Copy JSON
											</Button>
										</div>
										<pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96 border">
											{JSON.stringify(result.data || { error: result.error }, null, 2)}
										</pre>
									</div>

									{/* Errors Array */}
									{result.success && result.data?.errors?.length > 0 && (
										<Alert variant="destructive">
											<AlertTriangle className="h-4 w-4" />
											<AlertTitle>
												Partial Failures ({result.data.errors.length})
											</AlertTitle>
											<AlertDescription>
												<div className="mt-2 space-y-2">
													{result.data.errors.map((error: any, idx: number) => (
														<div key={idx} className="text-xs">
															<strong>User:</strong> {error.user_id} - {error.message}
														</div>
													))}
												</div>
											</AlertDescription>
										</Alert>
									)}
								</div>
							</CardContent>
						)}
					</Card>
				);
			})}

			{/* Additional Info Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ExternalLink className="h-5 w-5" />
						View Logs in Vercel
					</CardTitle>
					<CardDescription>
						For production logs and historical execution data
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
						<li>Go to your project in Vercel Dashboard</li>
						<li>
							Navigate to <strong>Logs</strong> tab
						</li>
						<li>
							Filter by function path:{" "}
							<code className="text-xs">/api/cron/youtube-feed</code> or{" "}
							<code className="text-xs">/api/cron/generate-episodes</code>
						</li>
						<li>View execution history, errors, and performance metrics</li>
					</ul>
					<div className="mt-4">
						<Button variant="outline" asChild>
							<a
								href="https://vercel.com/dashboard"
								target="_blank"
								rel="noopener noreferrer">
								Open Vercel Dashboard
								<ExternalLink className="ml-2 h-4 w-4" />
							</a>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Authentication Note */}
			<Alert>
				<AlertTitle>Authentication</AlertTitle>
				<AlertDescription>
					Cron endpoints are protected and will use your current session authentication.
					In production, Vercel automatically includes the <code>x-vercel-cron</code>{" "}
					header.
				</AlertDescription>
			</Alert>
		</div>
	);
}
