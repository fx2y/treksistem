<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect to login page by default
		goto('/login');
	});
</script>

<div class="flex items-center justify-center min-h-screen">
	<div class="text-center">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">Mitra Portal</h1>
		<p class="text-gray-600">Redirecting to login...</p>
	</div>
</div>