<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/services/apiClient';
	import type { Vehicle } from '$lib/types';
	import { Plus, Edit, Trash2, Save, X } from 'lucide-svelte';

	let vehicles: Vehicle[] = [];
	let loading = true;
	let error = '';
	let showAddForm = false;
	let editingVehicle: Vehicle | null = null;
	let submitting = false;

	// Form state
	let formData = {
		licensePlate: '',
		description: ''
	};

	onMount(async () => {
		await loadVehicles();
	});

	async function loadVehicles() {
		try {
			loading = true;
			vehicles = await apiClient.get<Vehicle[]>('/mitra/vehicles');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load vehicles';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			licensePlate: '',
			description: ''
		};
		showAddForm = false;
		editingVehicle = null;
		error = '';
	}

	function startAdd() {
		resetForm();
		showAddForm = true;
	}

	function startEdit(vehicle: Vehicle) {
		formData = {
			licensePlate: vehicle.licensePlate,
			description: vehicle.description
		};
		editingVehicle = vehicle;
		showAddForm = false;
		error = '';
	}

	async function handleSubmit() {
		if (!formData.licensePlate.trim()) {
			error = 'License plate is required';
			return;
		}

		try {
			submitting = true;
			error = '';

			const vehicleData = {
				licensePlate: formData.licensePlate.trim().toUpperCase(),
				description: formData.description.trim()
			};

			if (editingVehicle) {
				// Update existing vehicle
				const updatedVehicle = await apiClient.put<Vehicle>(`/mitra/vehicles/${editingVehicle.id}`, vehicleData);
				vehicles = vehicles.map(v => v.id === editingVehicle?.id ? updatedVehicle : v);
			} else {
				// Create new vehicle
				const newVehicle = await apiClient.post<Vehicle>('/mitra/vehicles', vehicleData);
				vehicles = [...vehicles, newVehicle];
			}

			resetForm();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save vehicle';
		} finally {
			submitting = false;
		}
	}

	async function deleteVehicle(vehicleId: string, licensePlate: string) {
		if (!confirm(`Are you sure you want to delete vehicle ${licensePlate}?`)) {
			return;
		}

		try {
			await apiClient.del(`/mitra/vehicles/${vehicleId}`);
			vehicles = vehicles.filter(v => v.id !== vehicleId);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete vehicle';
		}
	}
</script>

<div class="space-y-6">
	<div class="sm:flex sm:items-center">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-bold text-gray-900">Vehicles</h1>
			<p class="mt-1 text-sm text-gray-500">
				Manage your delivery vehicle fleet
			</p>
		</div>
		<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
			<button
				type="button"
				on:click={startAdd}
				class="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
			>
				<Plus class="h-4 w-4 mr-2" />
				Add Vehicle
			</button>
		</div>
	</div>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
			{error}
		</div>
	{/if}

	<!-- Add/Edit Form -->
	{#if showAddForm || editingVehicle}
		<div class="bg-white shadow sm:rounded-lg">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="text-lg leading-6 font-medium text-gray-900">
					{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
				</h3>
				<form on:submit|preventDefault={handleSubmit} class="mt-5 space-y-4">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label for="licensePlate" class="block text-sm font-medium text-gray-700">
								License Plate
							</label>
							<input
								type="text"
								id="licensePlate"
								bind:value={formData.licensePlate}
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="e.g., B 1234 XYZ"
								required
							/>
						</div>

						<div>
							<label for="description" class="block text-sm font-medium text-gray-700">
								Description
							</label>
							<input
								type="text"
								id="description"
								bind:value={formData.description}
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="e.g., Honda Beat - Blue"
							/>
						</div>
					</div>

					<div class="flex justify-end space-x-3">
						<button
							type="button"
							on:click={resetForm}
							class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
						>
							<X class="h-4 w-4 mr-2" />
							Cancel
						</button>
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
							{editingVehicle ? 'Update' : 'Add'} Vehicle
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Vehicles List -->
	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-sm text-gray-500">Loading vehicles...</p>
		</div>
	{:else if vehicles.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-500">
				<p class="text-lg font-medium">No vehicles yet</p>
				<p class="mt-1 text-sm">Get started by adding your first vehicle</p>
				<div class="mt-6">
					<button
						type="button"
						on:click={startAdd}
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
					>
						<Plus class="h-4 w-4 mr-2" />
						Add Vehicle
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="bg-white shadow overflow-hidden sm:rounded-md">
			<ul class="divide-y divide-gray-200">
				{#each vehicles as vehicle}
					<li class="px-6 py-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
										<span class="text-blue-600 font-medium text-sm">
											{vehicle.licensePlate.split(' ')[0]}
										</span>
									</div>
								</div>
								<div class="ml-4">
									<h3 class="text-lg font-medium text-gray-900">
										{vehicle.licensePlate}
									</h3>
									{#if vehicle.description}
										<div class="mt-1 text-sm text-gray-500">
											{vehicle.description}
										</div>
									{/if}
								</div>
							</div>
							<div class="flex items-center space-x-2">
								<button
									type="button"
									on:click={() => startEdit(vehicle)}
									class="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
									title="Edit Vehicle"
								>
									<Edit class="h-4 w-4" />
								</button>
								<button
									type="button"
									on:click={() => deleteVehicle(vehicle.id, vehicle.licensePlate)}
									class="inline-flex items-center p-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
									title="Delete Vehicle"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>