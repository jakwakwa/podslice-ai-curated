/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
			remotePatterns: [
				{ protocol: 'https', hostname: 'images.unsplash.com' },
				{ protocol: 'https', hostname: 'picsum.photos' },
				{ protocol: 'https', hostname: 'youtu.be' },
				{ protocol: 'https', hostname: 'yt3.ggpht.com', pathname: '/**' },
				{ protocol: 'https', hostname: 'storage.cloud.google.com' },
				{ protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
				{ protocol: 'https', hostname: 'lh3.googleusercontent.com' },
				{ protocol: 'https', hostname: 'graph.facebook.com' },
				{ protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
				{ protocol: 'https', hostname: 'pbs.twimg.com' },
				{ protocol: 'https', hostname: 'abs.twimg.com' },
				{ protocol: 'https', hostname: 'images.ctfassets.net' },
				{ protocol: 'https', hostname: 'res.cloudinary.com' },
				{ protocol: 'https', hostname: 'img.clerk.com' },
				{ protocol: 'https', hostname: 'i.ytimg.com' },
			],
			domains: ['yt3.ggpht.com', 'picsum.photos'],
	},
	webpack: (config) => {
			config.resolve.alias = {
					...config.resolve.alias,
			};
			return config;
	},
		async headers() {
				const clerkHosts = [
						'joint-weevil-31.clerk.accounts.dev',
						'clerk.podslice.ai',
						'accounts.podslice.ai',
				];

				const extraHosts = [
						'https://joint-weevil-31.clerk.accounts.dev',
						'https://challenges.cloudflare.com',
						'https://vendors.paddle.com',
						'https://checkout.paddle.com',
						'https://va.vercel-scripts.com',
						'https://vercel.live',
						'https://clerk.podslice.ai',
						'https://cdn.paddle.com/paddle/v2/paddle.js',
						'https://cdn.paddle.com'
				];

				const csp = {
					'default-src': ["'self'"],
						'script-src': [
							"'self'",
							"'unsafe-eval'",
							"'unsafe-inline'",
								...clerkHosts.map(h => `https://${h}`),
								...extraHosts,
					],
					'style-src': [
							"'self'",
							"'unsafe-inline'",
							'https://fonts.googleapis.com',
							'https://sandbox-cdn.paddle.com',
							'https://cdn.paddle.com',
					],
					'img-src': [
							"'self'",
							'data:',
							'images.unsplash.com',
						'picsum.photos',
							'youtu.be',
							'yt3.ggpht.com',
							'storage.cloud.google.com',
							'storage.googleapis.com',
							'firebasestorage.googleapis.com',
							'lh3.googleusercontent.com',
							'graph.facebook.com',
							'platform-lookaside.fbsbx.com',
							'pbs.twimg.com',
							'abs.twimg.com',
							'images.ctfassets.net',
							'res.cloudinary.com',
							'img.clerk.com',
							'via.placeholder.com',
							'i.ytimg.com',
					],
					'font-src': ["'self'", 'https://fonts.gstatic.com'],
					'media-src': [
							"'self'",
							'blob:',
							'https://storage.googleapis.com',
							'https://storage.cloud.google.com',
							'*.googleusercontent.com',
							'https://*.googleapis.com',
							'https://*.google.com',
					],
						'connect-src': [
							"'self'",
								...clerkHosts.map(h => `https://${h}`),
								...extraHosts,
								'https://api.paddle.com',
								'https://sandbox-api.paddle.com', // Allow Paddle sandbox API connections
							'https://clerk-telemetry.com',
							'https://vitals.vercel-insights.com',
							'https://storage.googleapis.com',
							'https://storage.cloud.google.com',
							'*.googleusercontent.com',
							'https://*.googleapis.com',
							'https://*.google.com',
							'https://cdn.paddle.com', // Allow Paddle CDN connections for source maps
					],
					'worker-src': ["'self'", 'blob:'],
						'frame-src': [
							"'self'",
							'https://challenges.cloudflare.com',
								'https://sandbox-buy.paddle.com',
								'https://checkout.paddle.com',
								'https://vendors.paddle.com',
							'https://player.cloudinary.com',
								...clerkHosts.map(h => `https://${h}`),
								...extraHosts,
					],
					'object-src': ["'none'"],
					'base-uri': ["'self'"],
					'form-action': ["'self'"],
					'frame-ancestors': ["'self'"],
					'upgrade-insecure-requests': [],
			};

			const cspHeader = Object.entries(csp)
					.map(([key, value]) => {
							if (value.length === 0) {
									return key;
							}
							return `${key} ${value.join(' ')}`;
					})
					.join('; ');

			return [
					{
							source: '/(.*)',
							headers: [
									{
											key: 'Content-Security-Policy',
											value: cspHeader,
									},
							],
					},
			];
	},
};

export default nextConfig;
