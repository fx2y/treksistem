<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiClient } from '$lib/services/apiClient';
	import {
		orderFormStore,
		setServiceId,
		addStop,
		removeStop,
		updateStop,
		setQuote,
		setSubmitting,
		setError,
		resetOrderForm
	} from '$lib/state/orderFormStore';
	import type { StopInput } from '$lib/types';

	$: serviceId = $page.params.serviceId;
	$: formState = $orderFormStore;

	let quoteTimeout: NodeJS.Timeout | null = null;

	onMount(() => {
		resetOrderForm();
		setServiceId(serviceId);
	});

	function handleStopChange(index: number, field: keyof StopInput, value: string | number) {
		updateStop(index, { [field]: value });
		
		// Debounce quote request
		if (quoteTimeout) {
			clearTimeout(quoteTimeout);
		}
		
		quoteTimeout = setTimeout(() => {
			requestQuote();
		}, 1000);
	}

	async function requestQuote() {
		const validStops = formState.stops.filter(stop => 
			stop.address.trim() && stop.lat !== 0 && stop.lng !== 0
		);

		if (validStops.length < 2) {
			setQuote(null);
			return;
		}

		try {
			const quote = await apiClient.getQuote({
				serviceId: formState.serviceId,
				stops: validStops
			});
			setQuote(quote);
			setError(null);
		} catch (err) {
			setError('Failed to get quote. Please check your addresses.');
			setQuote(null);
			console.error('Quote error:', err);
		}
	}

	function handleAddStop() {
		addStop();
	}

	function handleRemoveStop(index: number) {
		if (formState.stops.length > 2) {
			removeStop(index);
			requestQuote();
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		if (!formState.quote) {
			setError('Please wait for quote calculation');
			return;
		}

		const validStops = formState.stops.filter(stop => 
			stop.address.trim() && stop.lat !== 0 && stop.lng !== 0
		);

		if (validStops.length < 2) {
			setError('Please provide at least one pickup and one dropoff location');
			return;
		}

		if (!formState.ordererName.trim() || !formState.ordererPhone.trim()) {
			setError('Please provide orderer information');
			return;
		}

		try {
			setSubmitting(true);
			setError(null);

			const response = await apiClient.createOrder({
				serviceId: formState.serviceId,
				stops: validStops,
				ordererName: formState.ordererName,
				ordererPhone: formState.ordererPhone,
				recipientName: formState.recipientName || formState.ordererName,
				recipientPhone: formState.recipientPhone || formState.ordererPhone,
				notes: formState.notes
			});

			// Redirect to success page with order data
			goto(`/order/success?publicId=${response.publicId}&logId=${response.notificationLogId}`);
		} catch (err) {
			setError('Failed to create order. Please try again.');
			console.error('Order creation error:', err);
		} finally {
			setSubmitting(false);
		}
	}

	// Simple coordinate validation for demo
	function parseCoordinate(value: string): number {
		const num = parseFloat(value);
		return isNaN(num) ? 0 : num;
	}
</script>

<svelte:head>
	<title>Create Order - Treksistem</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="container mx-auto px-4 max-w-2xl">
		<div class="bg-white rounded-lg shadow-lg p-8">
			<h1 class="text-2xl font-bold text-gray-900 mb-6">Create New Order</h1>
			<p class="text-gray-600 mb-8">Service ID: {serviceId}</p>

			<form on:submit={handleSubmit} class="space-y-6">
				<!-- Stops Section -->
				<div>
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Delivery Route</h2>
					<div class="space-y-4">
						{#each formState.stops as stop, index}
							<div class="border border-gray-200 rounded-lg p-4">
								<div class="flex justify-between items-center mb-3">
									<h3 class="font-medium text-gray-900">
										{stop.type === 'pickup' ? 'Pickup' : 'Dropoff'} #{index + 1}
									</h3>
									{#if formState.stops.length > 2}
										<button
											type="button"
											on:click={() => handleRemoveStop(index)}
											class="text-red-600 hover:text-red-800 text-sm"
										>
											Remove
										</button>
									{/if}
								</div>

								<div class="grid grid-cols-1 gap-3">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">
											Address
										</label>
										<input
											type="text"
											value={stop.address}
											on:input={(e) => handleStopChange(index, 'address', (e.target as HTMLInputElement).value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter full address"
											required
										/>
									</div>

									<div class="grid grid-cols-2 gap-3">
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-1">
												Latitude
											</label>
											<input
												type="number"
												step="0.0001"
												value={stop.lat || ''}
												on:input={(e) => handleStopChange(index, 'lat', parseCoordinate((e.target as HTMLInputElement).value))}
												class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder="-6.2088"
												required
											/>
										</div>
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-1">
												Longitude
											</label>
											<input
												type="number"
												step="0.0001"
												value={stop.lng || ''}
												on:input={(e) => handleStopChange(index, 'lng', parseCoordinate((e.target as HTMLInputElement).value))}
												class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder="106.8456"
												required
											/>
										</div>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">
											Type
										</label>
										<select
											value={stop.type}
											on:change={(e) => handleStopChange(index, 'type', (e.target as HTMLSelectElement).value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											<option value="pickup">Pickup</option>
											<option value="dropoff">Dropoff</option>
										</select>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<button
						type="button"
						on:click={handleAddStop}
						class="mt-4 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
					>
						+ Add Stop
					</button>
				</div>

				<!-- Quote Display -->
				{#if formState.quote}
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<h3 class="font-medium text-green-900 mb-2">Price Estimate</h3>
						<div class="text-green-800">
							<div>Cost: <span class="font-semibold">Rp {formState.quote.estimatedCost.toLocaleString('id-ID')}</span></div>
							<div>Distance: <span class="font-semibold">{formState.quote.totalDistanceKm.toFixed(2)} km</span></div>
						</div>
					</div>
				{/if}

				<!-- Customer Information -->
				<div>
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">
								Orderer Name
							</label>
							<input
								type="text"
								bind:value={formState.ordererName}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Your name"
								required
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">
								Orderer Phone
							</label>
							<input
								type="tel"
								bind:value={formState.ordererPhone}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="081234567890"
								required
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">
								Recipient Name (optional)
							</label>
							<input
								type="text"
								bind:value={formState.recipientName}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Leave empty if same as orderer"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">
								Recipient Phone (optional)
							</label>
							<input
								type="tel"
								bind:value={formState.recipientPhone}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Leave empty if same as orderer"
							/>
						</div>
					</div>
				</div>

				<!-- Additional Notes -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Additional Notes (optional)
					</label>
					<textarea
						bind:value={formState.notes}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Any special instructions..."
					></textarea>
				</div>

				<!-- Error Display -->
				{#if formState.error}
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-red-800">{formState.error}</p>
					</div>
				{/if}

				<!-- Submit Button -->
				<div class="flex gap-4">
					<button
						type="submit"
						disabled={formState.isSubmitting || !formState.quote}
						class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
					>
						{#if formState.isSubmitting}
							Creating Order...
						{:else}
							Create Order
						{/if}
					</button>
					<a
						href="/"
						class="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>
	</div>
</div>