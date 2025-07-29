<script lang="ts">
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import '../app.css';

	onMount(() => {
		registerSW({
			onNeedRefresh() {},
			onOfflineReady() {}
		});
	});

	let { children, data } = $props();
</script>

{@render children()}
