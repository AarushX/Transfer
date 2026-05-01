import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	optimizeDeps: {
		// @zxing/browser pre-bundles against @zxing/library; keep both explicit for resolution (pnpm).
		include: ['@zxing/browser', '@zxing/library']
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['icon.svg', 'robots.txt'],
			manifest: {
				name: 'Transfer',
				short_name: 'Transfer',
				description: 'Training, checkoffs, and machine shop access',
				theme_color: '#020617',
				background_color: '#020617',
				display: 'standalone',
				start_url: '/dashboard',
				scope: '/',
				icons: [
					{
						src: '/icon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any'
					}
				]
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
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
