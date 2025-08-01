/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';

// Register the service worker.
// The `onNeedRefresh` and `onOfflineReady` callbacks are optional.
// You can use them to display a toast message to the user, for example.
registerSW({
	onNeedRefresh() {
		// Logic to show a "new version available" message to the user.
		console.log('New content available, please refresh.');
	},
	onOfflineReady() {
		// Logic to inform the user that the app can work offline.
		console.log('App is ready to work offline.');
	}
});
