<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/services/apiClient';
	import type { ServiceDiscoveryResponse } from '$lib/types';

	let services: ServiceDiscoveryResponse[] = [];
	let loading = true;
	let error = '';

	// Default location (Jakarta center)
	let lat = -6.2088;
	let lng = 106.8456;
	let payloadTypeId = 'food'; // Default payload type

	async function loadServices() {
		try {
			loading = true;
			error = '';
			services = await apiClient.findAvailableServices(lat, lng, payloadTypeId);
		} catch (err) {
			error = 'Failed to load available services. Please try again.';
			console.error('Error loading services:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadServices();
	});

	function handleLocationChange() {
		loadServices();
	}
</script>

<svelte:head>
	<title>Treksistem - On-Demand Delivery Services</title>
	<meta name="description" content="Find and book reliable delivery services in your area" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Hero Section -->
		<div class="text-center mb-12">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">
				Fast & Reliable Delivery Services
			</h1>
			<p class="text-xl text-gray-600 mb-8">
				Connect with trusted local delivery partners for all your logistics needs
			</p>
		</div>

		<!-- Location & Filter Section -->
		<div class="bg-white rounded-lg shadow-md p-6 mb-8">
			<h2 class="text-lg font-semibold mb-4">Find Services Near You</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
					<input
						type="number"
						step="0.0001"
						bind:value={lat}
						on:change={handleLocationChange}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
					<input
						type="number"
						step="0.0001"
						bind:value={lng}
						on:change={handleLocationChange}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Payload Type</label>
					<select
						bind:value={payloadTypeId}
						on:change={handleLocationChange}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="food">Food</option>
						<option value="package">Package</option>
						<option value="document">Document</option>
						<option value="medicine">Medicine</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Services List -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-lg font-semibold mb-6">Available Services</h2>

			{#if loading}
				<div class="flex justify-center items-center py-12">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			{:else if error}
				<div class="text-center py-12">
					<div class="text-red-600 mb-4">{error}</div>
					<button
						on:click={loadServices}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						Retry
					</button>
				</div>
			{:else if services.length === 0}
				<div class="text-center py-12 text-gray-500">
					No services available in your area for the selected payload type.
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each services as service}
						<div class="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
							<div class="mb-4">
								<h3 class="text-lg font-semibold text-gray-900 mb-2">
									{service.serviceName}
								</h3>
								<p class="text-sm text-gray-600">
									by {service.mitraName}
								</p>
							</div>
							
							<div class="mb-4">
								<span class="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
									Service ID: {service.serviceId}
								</span>
							</div>

							<a
								href="/order/{service.serviceId}"
								class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center block"
							>
								Book Now
							</a>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="text-center mt-12 text-gray-600">
			<p>&copy; 2024 Treksistem. Connecting communities through reliable logistics.</p>
		</div>
	</div>
</div>