import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	server: {
		port: 3000
	},
	plugins: [
		sveltekit(),
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			injectRegister: null,
			includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
			workbox: {
				globPatterns: ['**/*.{js,css,ico,html,png,svg,json}'],
				clientsClaim: true,
				skipWaiting: true,
				// Force precache `/` (index.html)
				additionalManifestEntries: [
					{ url: '/', revision: Date.now().toString() }, // forces a revision
					{ url: '/index.html', revision: Date.now().toString() }
				],
				// SPA fallback
				navigateFallback: '/index.html',
				// Avoid fallback for API calls or assets
				navigateFallbackDenylist: [/^\/api\//, /.*\.(?:png|jpg|jpeg|svg|webp)$/],
				maximumFileSizeToCacheInBytes: 100 * 1024 * 1024,
				runtimeCaching: [
					{
						urlPattern: ({ url }) => {
							return url.pathname.startsWith('/api/metar');
						},
						handler: 'NetworkFirst',
						options: {
							cacheName: 'metar-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60
							},
							cacheableResponse: {
								statuses: [0, 200] // Cache opaque (cross-origin) and successful responses
							}
							/* plugins: [
								{
									fetchDidSucceed: async ({ request, response }) => {
										console.log(
											'[Service Worker] Fetch Succeeded:',
											`URL: ${request.url}`,
											`Status: ${response.status}`
										);
										return response; // Must return the response
									},
									cacheDidUpdate: async ({ cacheName, request }) => {
										console.log(
											'[Service Worker] Cache Updated:',
											`Cache: ${cacheName}`,
											`URL: ${request.url}`
										);
									},
									fetchDidFail: async ({ request }) => {
										console.log(`[Service Worker] Fetch Failed: ${request.url}`);
									}
								}
							] */
						}
					},
					{
						urlPattern: ({ request }) =>
							request.destination === 'document' ||
							request.destination === 'script' ||
							request.destination === 'style',
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'app-shell',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 // 1 day
							}
						}
					}
				],
				// Pre-warm cache
				cleanupOutdatedCaches: true
			},
			manifest: {
				name: 'T-54 TOLD',
				short_name: 'T-54 TOLD',
				description: 'T-54 Takeoff and Landing Distance Calculator',
				theme_color: '#e7000b',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				background_color: '#e7000b',
				icons: [
					{
						src: '/favicon-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/favicon-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/favicon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			devOptions: {
				enabled: true // So PWA works in `vite preview`
			}
		})
	],
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
