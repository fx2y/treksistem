<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiClient } from '$lib/services/apiClient';
	import type { Service, Driver, Vehicle } from '$lib/types';
	import { ArrowLeft, Save, Plus, Trash2, MapPin } from 'lucide-svelte';

	let services: Service[] = [];
	let drivers: Driver[] = [];
	let vehicles: Vehicle[] = [];
	let loading = true;
	let submitting = false;
	let error = '';
	let quoteLoading = false;
	let estimatedCost: number | null = null;

	// Form state
	let formData = {
		serviceId: '',
		ordererName: '',
		ordererPhone: '',
		recipientName: '',
		recipientPhone: '',
		notes: '',
		assignToDriverId: '',
		assignToVehicleId: '',
		sendNotifications: true,
		stops: [
			{ address: '', lat: 0, lng: 0, type: 'pickup' as const },
			{ address: '', lat: 0, lng: 0, type: 'dropoff' as const }
		]
	};

	onMount(async () => {
		await Promise.all([loadServices(), loadDrivers(), loadVehicles()]);
	});

	async function loadServices() {
		try {
			services = await apiClient.get<Service[]>('/mitra/services');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load services';
		}
	}

	async function loadDrivers() {
		try {
			drivers = await apiClient.get<Driver[]>('/mitra/drivers');
		} catch (err) {
			console.warn('Failed to load drivers:', err);
		}
	}

	async function loadVehicles() {
		try {
			vehicles = await apiClient.get<Vehicle[]>('/mitra/vehicles');
		} catch (err) {
			console.warn('Failed to load vehicles:', err);
		} finally {
			loading = false;
		}
	}

	async function requestQuote() {
		if (!formData.serviceId || formData.stops.length < 2) return;
		
		const validStops = formData.stops.filter(stop => 
			stop.address.trim() && stop.lat !== 0 && stop.lng !== 0
		);
		
		if (validStops.length < 2) return;

		try {
			quoteLoading = true;
			const response = await apiClient.post<{ estimatedCost: number }>('/public/quote', {
				serviceId: formData.serviceId,
				stops: validStops
			});
			estimatedCost = response.estimatedCost;
		} catch (err) {
			console.warn('Failed to get quote:', err);
			estimatedCost = null;
		} finally {
			quoteLoading = false;
		}
	}

	function addStop() {
		formData.stops = [...formData.stops, { 
			address: '', 
			lat: 0, 
			lng: 0, 
			type: 'dropoff' as const 
		}];
	}

	function removeStop(index: number) {
		if (formData.stops.length > 2) {
			formData.stops = formData.stops.filter((_, i) => i !== index);
		}
	}

	function moveStop(index: number, direction: 'up' | 'down') {
		const newStops = [...formData.stops];
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		
		if (newIndex >= 0 && newIndex < newStops.length) {
			[newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]];
			formData.stops = newStops;
		}
	}

	// Debounced quote request
	let quoteTimeout: number;
	$: {
		if (formData.serviceId && formData.stops.length >= 2) {
			clearTimeout(quoteTimeout);
			quoteTimeout = setTimeout(requestQuote, 500);
		}
	}

	async function handleSubmit() {
		if (!formData.serviceId || !formData.ordererName.trim() || !formData.recipientName.trim()) {
			error = 'Please fill in all required fields';
			return;
		}

		const validStops = formData.stops.filter(stop => 
			stop.address.trim() && stop.lat !== 0 && stop.lng !== 0
		);

		if (validStops.length < 2) {
			error = 'Please provide at least 2 valid stops with coordinates';
			return;
		}

		try {
			submitting = true;
			error = '';

			const orderData = {
				serviceId: formData.serviceId,
				ordererName: formData.ordererName.trim(),
				ordererPhone: formData.ordererPhone.trim(),
				recipientName: formData.recipientName.trim(),
				recipientPhone: formData.recipientPhone.trim(),
				notes: formData.notes.trim(),
				stops: validStops,
				assignToDriverId: formData.assignToDriverId || undefined,
				assignToVehicleId: formData.assignToVehicleId || undefined,
				sendNotifications: formData.sendNotifications
			};

			const response = await apiClient.post<{
				id: string;
				publicId: string;
				trackingUrl: string;
				notificationLogId: string;
			}>('/mitra/orders', orderData);

			// Show success message with tracking URL
			await goto(`/orders/${response.publicId}?created=true`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create order';
		} finally {
			submitting = false;
		}
	}

	function handleAddressChange(index: number) {
		// In a real implementation, you would integrate with a geocoding service
		// For now, we'll use placeholder coordinates
		const stop = formData.stops[index];
		if (stop.address.trim()) {
			// Placeholder coordinates for Jakarta area
			stop.lat = -6.2 + Math.random() * 0.1;
			stop.lng = 106.8 + Math.random() * 0.1;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center space-x-4">
		<a
			href="/dashboard"
			class="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
		>
			<ArrowLeft class="h-4 w-4" />
		</a>
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Create Manual Order</h1>
			<p class="mt-1 text-sm text-gray-500">
				Enter order details for offline customers and dispatch to drivers
			</p>
		</div>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-sm text-gray-500">Loading form data...</p>
		</div>
	{:else}
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<!-- Service Selection -->
			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Service</h3>
						<p class="mt-1 text-sm text-gray-500">Select the delivery service type</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<select
							bind:value={formData.serviceId}
							class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							required
						>
							<option value="">Select a service</option>
							{#each services as service}
								<option value={service.id}>
									{service.name} - Rp {service.rate.baseFee.toLocaleString('id-ID')} + Rp {service.rate.feePerKm.toLocaleString('id-ID')}/km
								</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<!-- Customer Information -->
			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Customer Information</h3>
						<p class="mt-1 text-sm text-gray-500">Orderer and recipient details</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="grid grid-cols-6 gap-6">
							<div class="col-span-3">
								<label for="ordererName" class="block text-sm font-medium text-gray-700">
									Orderer Name
								</label>
								<input
									type="text"
									id="ordererName"
									bind:value={formData.ordererName}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									required
								/>
							</div>

							<div class="col-span-3">
								<label for="ordererPhone" class="block text-sm font-medium text-gray-700">
									Orderer Phone
								</label>
								<input
									type="tel"
									id="ordererPhone"
									bind:value={formData.ordererPhone}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									required
								/>
							</div>

							<div class="col-span-3">
								<label for="recipientName" class="block text-sm font-medium text-gray-700">
									Recipient Name
								</label>
								<input
									type="text"
									id="recipientName"
									bind:value={formData.recipientName}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									required
								/>
							</div>

							<div class="col-span-3">
								<label for="recipientPhone" class="block text-sm font-medium text-gray-700">
									Recipient Phone
								</label>
								<input
									type="tel"
									id="recipientPhone"
									bind:value={formData.recipientPhone}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									required
								/>
							</div>

							<div class="col-span-6">
								<label for="notes" class="block text-sm font-medium text-gray-700">
									Notes (optional)
								</label>
								<textarea
									id="notes"
									bind:value={formData.notes}
									rows="3"
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									placeholder="Special instructions, item description, etc."
								></textarea>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Stops -->
			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Delivery Stops</h3>
						<p class="mt-1 text-sm text-gray-500">
							Add pickup and dropoff locations. Minimum 2 stops required.
						</p>
						{#if estimatedCost !== null}
							<div class="mt-4 p-3 bg-green-50 rounded-md">
								<div class="text-sm font-medium text-green-800">
									Estimated Cost: Rp {estimatedCost.toLocaleString('id-ID')}
								</div>
							</div>
						{:else if quoteLoading}
							<div class="mt-4 p-3 bg-blue-50 rounded-md">
								<div class="text-sm text-blue-800">Calculating quote...</div>
							</div>
						{/if}
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="space-y-4">
							{#each formData.stops as stop, index}
								<div class="border border-gray-200 rounded-lg p-4">
									<div class="flex items-center justify-between mb-3">
										<div class="flex items-center space-x-2">
											<MapPin class="h-4 w-4 text-gray-400" />
											<span class="text-sm font-medium text-gray-700">
												Stop {index + 1} ({stop.type})
											</span>
										</div>
										<div class="flex items-center space-x-2">
											{#if index > 0}
												<button
													type="button"
													on:click={() => moveStop(index, 'up')}
													class="text-gray-400 hover:text-gray-600"
													title="Move up"
												>
													↑
												</button>
											{/if}
											{#if index < formData.stops.length - 1}
												<button
													type="button"
													on:click={() => moveStop(index, 'down')}
													class="text-gray-400 hover:text-gray-600"
													title="Move down"
												>
													↓
												</button>
											{/if}
											{#if formData.stops.length > 2}
												<button
													type="button"
													on:click={() => removeStop(index)}
													class="text-red-400 hover:text-red-600"
													title="Remove stop"
												>
													<Trash2 class="h-4 w-4" />
												</button>
											{/if}
										</div>
									</div>

									<div class="grid grid-cols-12 gap-3">
										<div class="col-span-3">
											<select
												bind:value={stop.type}
												class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
											>
												<option value="pickup">Pickup</option>
												<option value="dropoff">Dropoff</option>
											</select>
										</div>
										<div class="col-span-9">
											<input
												type="text"
												bind:value={stop.address}
												on:blur={() => handleAddressChange(index)}
												placeholder="Enter address"
												class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
												required
											/>
										</div>
									</div>
								</div>
							{/each}

							<button
								type="button"
								on:click={addStop}
								class="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<Plus class="h-5 w-5 mx-auto text-gray-400" />
								<span class="mt-1 block text-sm text-gray-600">Add another stop</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Assignment (optional) -->
			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Assignment (Optional)</h3>
						<p class="mt-1 text-sm text-gray-500">
							Assign directly to a driver and vehicle, or leave blank for broadcast dispatch
						</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="grid grid-cols-6 gap-6">
							<div class="col-span-3">
								<label for="assignToDriverId" class="block text-sm font-medium text-gray-700">
									Driver
								</label>
								<select
									id="assignToDriverId"
									bind:value={formData.assignToDriverId}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								>
									<option value="">Auto-assign (broadcast)</option>
									{#each drivers as driver}
										<option value={driver.id}>{driver.name}</option>
									{/each}
								</select>
							</div>

							<div class="col-span-3">
								<label for="assignToVehicleId" class="block text-sm font-medium text-gray-700">
									Vehicle
								</label>
								<select
									id="assignToVehicleId"
									bind:value={formData.assignToVehicleId}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								>
									<option value="">Any available vehicle</option>
									{#each vehicles as vehicle}
										<option value={vehicle.id}>
											{vehicle.licensePlate} - {vehicle.description}
										</option>
									{/each}
								</select>
							</div>

							<div class="col-span-6">
								<div class="flex items-start">
									<div class="flex items-center h-5">
										<input
											id="sendNotifications"
											type="checkbox"
											bind:checked={formData.sendNotifications}
											class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
									</div>
									<div class="ml-3 text-sm">
										<label for="sendNotifications" class="font-medium text-gray-700">
											Send notifications
										</label>
										<p class="text-gray-500">
											Generate WhatsApp link for customer notifications
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{#if error}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			{/if}

			<div class="flex justify-end space-x-3">
				<a
					href="/dashboard"
					class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={submitting}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
				>
					{#if submitting}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
					{:else}
						<Save class="h-4 w-4 mr-2" />
					{/if}
					Create Order
				</button>
			</div>
		</form>
	{/if}
</div>