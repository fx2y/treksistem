<script lang="ts">
	import { onMount } from 'svelte';
	import { AuthService } from '$lib/services/authService';

	onMount(async () => {
		await AuthService.handleCallback();
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="text-center">
		<div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
		<h2 class="mt-4 text-xl font-semibold text-gray-900">Authenticating...</h2>
		<p class="mt-2 text-gray-600">Please wait while we sign you in</p>
	</div>
</div>