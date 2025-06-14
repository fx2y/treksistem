<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiClient } from '$lib/services/apiClient';

	$: publicId = $page.url.searchParams.get('publicId') || '';
	$: logId = $page.url.searchParams.get('logId') || '';

	let trackingUrl = '';
	let notificationSent = false;
	let sendingNotification = false;
	let error = '';

	onMount(() => {
		if (publicId) {
			trackingUrl = `/track/${publicId}`;
		}
	});

	async function handleWhatsAppNotify() {
		if (!logId) {
			error = 'No notification log ID available';
			return;
		}

		try {
			sendingNotification = true;
			error = '';

			// Call the notification trigger confirmation API first
			await apiClient.confirmNotificationTrigger(logId);
			notificationSent = true;

			// Create WhatsApp message
			const message = encodeURIComponent(
				`Your order has been created successfully! Track your delivery: ${window.location.origin}${trackingUrl}`
			);
			
			// Redirect to WhatsApp
			window.open(`https://wa.me/?text=${message}`, '_blank');
			
		} catch (err) {
			error = 'Failed to confirm notification. Please try again.';
			console.error('Notification confirmation error:', err);
		} finally {
			sendingNotification = false;
		}
	}
</script>

<svelte:head>
	<title>Order Created Successfully - Treksistem</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-8">
	<div class="container mx-auto px-4 max-w-md">
		<div class="bg-white rounded-lg shadow-lg p-8 text-center">
			<!-- Success Icon -->
			<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
				</svg>
			</div>

			<h1 class="text-2xl font-bold text-gray-900 mb-4">Order Created Successfully!</h1>
			
			{#if publicId}
				<p class="text-gray-600 mb-6">
					Your order has been submitted and is now pending dispatch.
				</p>

				<div class="bg-gray-50 rounded-lg p-4 mb-6">
					<div class="text-sm text-gray-600 mb-2">Order ID</div>
					<div class="font-mono text-sm bg-white px-3 py-2 rounded border">
						{publicId}
					</div>
				</div>

				<!-- Tracking Link -->
				<div class="mb-6">
					<a
						href={trackingUrl}
						class="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors inline-block"
					>
						Track Your Order
					</a>
				</div>

				<!-- WhatsApp Notification -->
				<div class="border-t border-gray-200 pt-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-3">
						Share via WhatsApp
					</h2>
					<p class="text-sm text-gray-600 mb-4">
						Send the tracking link to yourself or someone else via WhatsApp
					</p>

					{#if error}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
							<p class="text-red-800 text-sm">{error}</p>
						</div>
					{/if}

					{#if notificationSent}
						<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
							<p class="text-green-800 text-sm">✓ Notification confirmed! WhatsApp should open shortly.</p>
						</div>
					{/if}

					<button
						on:click={handleWhatsAppNotify}
						disabled={sendingNotification || notificationSent}
						class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
					>
						{#if sendingNotification}
							<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Preparing...
						{:else if notificationSent}
							✓ Sent
						{:else}
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
							</svg>
							Notify via WhatsApp
						{/if}
					</button>
				</div>
			{:else}
				<p class="text-red-600 mb-6">
					No order information available. Please check your order confirmation.
				</p>
			{/if}

			<!-- Back to Home -->
			<div class="mt-8 pt-6 border-t border-gray-200">
				<a
					href="/"
					class="text-blue-600 hover:text-blue-800 text-sm"
				>
					← Create Another Order
				</a>
			</div>
		</div>
	</div>
</div>