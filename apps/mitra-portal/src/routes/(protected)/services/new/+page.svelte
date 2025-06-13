<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiClient } from '$lib/services/apiClient';
	import type { MasterData, Service } from '$lib/types';
	import { ArrowLeft, Save } from 'lucide-svelte';

	let masterData: MasterData | null = null;
	let loading = true;
	let submitting = false;
	let error = '';

	// Form state
	let formData = {
		name: '',
		isPublic: true,
		maxRangeKm: 10,
		baseFee: 5000,
		feePerKm: 2000,
		supportedVehicleTypeIds: [] as string[],
		supportedPayloadTypeIds: [] as string[],
		availableFacilityIds: [] as string[]
	};

	onMount(async () => {
		await loadMasterData();
	});

	async function loadMasterData() {
		try {
			loading = true;
			masterData = await apiClient.get<MasterData>('/mitra/master-data');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load master data';
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!formData.name.trim()) {
			error = 'Service name is required';
			return;
		}

		try {
			submitting = true;
			error = '';

			const serviceData: Omit<Service, 'id'> = {
				name: formData.name.trim(),
				isPublic: formData.isPublic,
				maxRangeKm: formData.maxRangeKm,
				rate: {
					baseFee: formData.baseFee,
					feePerKm: formData.feePerKm
				},
				supportedVehicleTypeIds: formData.supportedVehicleTypeIds,
				supportedPayloadTypeIds: formData.supportedPayloadTypeIds,
				availableFacilityIds: formData.availableFacilityIds
			};

			await apiClient.post<Service>('/mitra/services', serviceData);
			await goto('/services');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create service';
		} finally {
			submitting = false;
		}
	}

	function toggleSelection(array: string[], id: string) {
		const index = array.indexOf(id);
		if (index > -1) {
			array.splice(index, 1);
		} else {
			array.push(id);
		}
		// Trigger reactivity
		formData = { ...formData };
	}
</script>

<div class="space-y-6">
	<div class="flex items-center space-x-4">
		<a
			href="/services"
			class="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
		>
			<ArrowLeft class="h-4 w-4" />
		</a>
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Create New Service</h1>
			<p class="mt-1 text-sm text-gray-500">
				Set up a new delivery service with pricing and availability
			</p>
		</div>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-sm text-gray-500">Loading form data...</p>
		</div>
	{:else if !masterData}
		<div class="text-center py-12">
			<div class="text-red-600 text-sm">{error}</div>
			<button
				type="button"
				on:click={loadMasterData}
				class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
			>
				Retry
			</button>
		</div>
	{:else}
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Basic Information</h3>
						<p class="mt-1 text-sm text-gray-500">
							Service name, visibility, and coverage area
						</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="grid grid-cols-6 gap-6">
							<div class="col-span-6">
								<label for="name" class="block text-sm font-medium text-gray-700">
									Service Name
								</label>
								<input
									type="text"
									id="name"
									bind:value={formData.name}
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									placeholder="e.g., Express Delivery"
									required
								/>
							</div>

							<div class="col-span-6">
								<div class="flex items-start">
									<div class="flex items-center h-5">
										<input
											id="isPublic"
											type="checkbox"
											bind:checked={formData.isPublic}
											class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
										/>
									</div>
									<div class="ml-3 text-sm">
										<label for="isPublic" class="font-medium text-gray-700">
											Make service public
										</label>
										<p class="text-gray-500">
											Public services can be booked by customers directly
										</p>
									</div>
								</div>
							</div>

							<div class="col-span-3">
								<label for="maxRangeKm" class="block text-sm font-medium text-gray-700">
									Maximum Range (km)
								</label>
								<input
									type="number"
									id="maxRangeKm"
									bind:value={formData.maxRangeKm}
									min="1"
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									required
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Pricing</h3>
						<p class="mt-1 text-sm text-gray-500">
							Set base fee and per-kilometer rate
						</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="grid grid-cols-6 gap-6">
							<div class="col-span-3">
								<label for="baseFee" class="block text-sm font-medium text-gray-700">
									Base Fee (Rp)
								</label>
								<input
									type="number"
									id="baseFee"
									bind:value={formData.baseFee}
									min="0"
									step="1000"
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									required
								/>
							</div>

							<div class="col-span-3">
								<label for="feePerKm" class="block text-sm font-medium text-gray-700">
									Fee per KM (Rp)
								</label>
								<input
									type="number"
									id="feePerKm"
									bind:value={formData.feePerKm}
									min="0"
									step="500"
									class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									required
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Vehicle Types</h3>
						<p class="mt-1 text-sm text-gray-500">
							Select which vehicle types can handle this service
						</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="grid grid-cols-2 gap-4">
							{#each masterData.vehicles as vehicle}
								<label class="flex items-start">
									<input
										type="checkbox"
										checked={formData.supportedVehicleTypeIds.includes(vehicle.id)}
										on:change={() => toggleSelection(formData.supportedVehicleTypeIds, vehicle.id)}
										class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5"
									/>
									<span class="ml-3 text-sm text-gray-700">{vehicle.name}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Payload Types</h3>
						<p class="mt-1 text-sm text-gray-500">
							Select what types of items can be delivered
						</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="grid grid-cols-2 gap-4">
							{#each masterData.payloads as payload}
								<label class="flex items-start">
									<input
										type="checkbox"
										checked={formData.supportedPayloadTypeIds.includes(payload.id)}
										on:change={() => toggleSelection(formData.supportedPayloadTypeIds, payload.id)}
										class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5"
									/>
									<span class="ml-3 text-sm text-gray-700">{payload.name}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
				<div class="md:grid md:grid-cols-3 md:gap-6">
					<div class="md:col-span-1">
						<h3 class="text-lg font-medium leading-6 text-gray-900">Available Facilities</h3>
						<p class="mt-1 text-sm text-gray-500">
							Select additional services offered with this delivery
						</p>
					</div>
					<div class="mt-5 md:mt-0 md:col-span-2">
						<div class="grid grid-cols-2 gap-4">
							{#each masterData.facilities as facility}
								<label class="flex items-start">
									<input
										type="checkbox"
										checked={formData.availableFacilityIds.includes(facility.id)}
										on:change={() => toggleSelection(formData.availableFacilityIds, facility.id)}
										class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5"
									/>
									<span class="ml-3 text-sm text-gray-700">{facility.name}</span>
								</label>
							{/each}
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
					href="/services"
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
					Create Service
				</button>
			</div>
		</form>
	{/if}
</div>