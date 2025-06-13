<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/services/apiClient';
	import type { Service } from '$lib/types';
	import { Plus, Edit, Eye, EyeOff } from 'lucide-svelte';

	let services: Service[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadServices();
	});

	async function loadServices() {
		try {
			loading = true;
			services = await apiClient.get<Service[]>('/mitra/services');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load services';
		} finally {
			loading = false;
		}
	}

	async function toggleServiceVisibility(service: Service) {
		try {
			const updatedService = await apiClient.put<Service>(`/mitra/services/${service.id}`, {
				isPublic: !service.isPublic
			});
			
			// Update local state
			services = services.map(s => s.id === service.id ? updatedService : s);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update service';
		}
	}
</script>

<div class="space-y-6">
	<div class="sm:flex sm:items-center">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-bold text-gray-900">Services</h1>
			<p class="mt-1 text-sm text-gray-500">
				Manage your delivery services and pricing
			</p>
		</div>
		<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
			<a
				href="/services/new"
				class="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
			>
				<Plus class="h-4 w-4 mr-2" />
				Add Service
			</a>
		</div>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-sm text-gray-500">Loading services...</p>
		</div>
	{:else if error}
		<div class="text-center py-12">
			<div class="text-red-600 text-sm">{error}</div>
			<button
				type="button"
				on:click={loadServices}
				class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
			>
				Retry
			</button>
		</div>
	{:else if services.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-500">
				<p class="text-lg font-medium">No services yet</p>
				<p class="mt-1 text-sm">Get started by creating your first delivery service</p>
				<div class="mt-6">
					<a
						href="/services/new"
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
					>
						<Plus class="h-4 w-4 mr-2" />
						Create Service
					</a>
				</div>
			</div>
		</div>
	{:else}
		<div class="bg-white shadow overflow-hidden sm:rounded-md">
			<ul class="divide-y divide-gray-200">
				{#each services as service}
					<li class="px-6 py-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
										<span class="text-blue-600 font-medium">
											{service.name.charAt(0).toUpperCase()}
										</span>
									</div>
								</div>
								<div class="ml-4">
									<div class="flex items-center">
										<h3 class="text-lg font-medium text-gray-900">
											{service.name}
										</h3>
										<button
											type="button"
											on:click={() => toggleServiceVisibility(service)}
											class="ml-2 p-1 rounded-full hover:bg-gray-100"
											title={service.isPublic ? 'Make Private' : 'Make Public'}
										>
											{#if service.isPublic}
												<Eye class="h-4 w-4 text-green-600" />
											{:else}
												<EyeOff class="h-4 w-4 text-gray-400" />
											{/if}
										</button>
									</div>
									<div class="mt-1 text-sm text-gray-500">
										Range: {service.maxRangeKm} km • 
										Base: Rp {service.rate.baseFee.toLocaleString('id-ID')} • 
										Per km: Rp {service.rate.feePerKm.toLocaleString('id-ID')}
									</div>
									<div class="mt-1 text-sm text-gray-500">
										{service.supportedVehicleTypeIds.length} vehicle types • 
										{service.supportedPayloadTypeIds.length} payload types
									</div>
								</div>
							</div>
							<div class="flex items-center space-x-2">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {service.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
									{service.isPublic ? 'Public' : 'Private'}
								</span>
								<a
									href="/services/{service.id}"
									class="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
									title="Edit Service"
								>
									<Edit class="h-4 w-4" />
								</a>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>