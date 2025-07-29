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
		VitePWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			injectRegister: 'auto',
			includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
			workbox: {
				globPatterns: ['**/*.{js,css,ico,png,svg,json}'],
				clientsClaim: true,
				skipWaiting: true,
				// SPA fallback
				navigateFallback: '/',
				// Avoid fallback for API calls or assets
				navigateFallbackDenylist: [/^\/api\//, /.*\.(?:png|jpg|jpeg|svg|webp)$/],
				maximumFileSizeToCacheInBytes: 100 * 1024 * 1024
			},
			manifest: {
				name: 'T-54 TOLD',
				short_name: 'T-54 TOLD',
				description: 'T-54 Takeoff and Landing Distance Calculator',
				theme_color: '#e7000b',
				start_url: '/',
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
		}),
		sveltekit(),
		tailwindcss()
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
