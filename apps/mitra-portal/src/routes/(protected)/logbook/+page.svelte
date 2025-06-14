<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/services/apiClient';
	import type { LogbookEntry, Vehicle } from '$lib/types';
	import { Calendar, Filter, Truck, Clock } from 'lucide-svelte';

	let logbookEntries: LogbookEntry[] = [];
	let vehicles: Vehicle[] = [];
	let loading = true;
	let error = '';

	// Filter state
	let selectedDate = new Date().toISOString().split('T')[0]; // Today's date
	let selectedVehicleId = '';
	let showFilters = false;

	onMount(async () => {
		await loadVehicles();
		await loadLogbook();
	});

	async function loadVehicles() {
		try {
			vehicles = await apiClient.get<Vehicle[]>('/mitra/vehicles');
		} catch (err) {
			console.error('Failed to load vehicles:', err);
		}
	}

	async function loadLogbook() {
		try {
			loading = true;

			const params = new URLSearchParams();
			if (selectedDate) params.append('date', selectedDate);
			if (selectedVehicleId) params.append('vehicleId', selectedVehicleId);

			logbookEntries = await apiClient.get<LogbookEntry[]>('/mitra/logbook', params);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load logbook';
		} finally {
			loading = false;
		}
	}

	async function handleFilterChange() {
		await loadLogbook();
	}

	function formatTime(timestamp: string) {
		return new Date(timestamp).toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDate(timestamp: string) {
		return new Date(timestamp).toLocaleDateString('id-ID', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getVehicleName(licensePlate: string) {
		const vehicle = vehicles.find((v) => v.licensePlate === licensePlate);
		return vehicle
			? `${vehicle.licensePlate}${vehicle.description ? ` (${vehicle.description})` : ''}`
			: licensePlate;
	}

	// Group entries by date
	$: groupedEntries = logbookEntries.reduce(
		(groups, entry) => {
			const date = entry.timestamp.split('T')[0];
			if (!groups[date]) {
				groups[date] = [];
			}
			groups[date].push(entry);
			return groups;
		},
		{} as Record<string, LogbookEntry[]>
	);

	$: sortedDates = Object.keys(groupedEntries).sort().reverse(); // Most recent first
</script>

<div class="space-y-6">
	<div class="sm:flex sm:items-center">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-bold text-gray-900">Logbook</h1>
			<p class="mt-1 text-sm text-gray-500">
				Historical accountability log of all delivery activities
			</p>
		</div>
		<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
			<button
				type="button"
				on:click={() => (showFilters = !showFilters)}
				class="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
			>
				<Filter class="h-4 w-4 mr-2" />
				Filters
			</button>
		</div>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<div class="bg-white shadow sm:rounded-lg">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="text-lg leading-6 font-medium text-gray-900">Filter Logbook</h3>
				<div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="date" class="block text-sm font-medium text-gray-700"> Date </label>
						<div class="mt-1 relative">
							<input
								type="date"
								id="date"
								bind:value={selectedDate}
								on:change={handleFilterChange}
								class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							/>
							<Calendar
								class="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none"
							/>
						</div>
					</div>

					<div>
						<label for="vehicle" class="block text-sm font-medium text-gray-700"> Vehicle </label>
						<div class="mt-1">
							<select
								id="vehicle"
								bind:value={selectedVehicleId}
								on:change={handleFilterChange}
								class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							>
								<option value="">All vehicles</option>
								{#each vehicles as vehicle}
									<option value={vehicle.id}>
										{vehicle.licensePlate}{vehicle.description ? ` (${vehicle.description})` : ''}
									</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Logbook Entries -->
	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-sm text-gray-500">Loading logbook...</p>
		</div>
	{:else if error}
		<div class="text-center py-12">
			<div class="text-red-600 text-sm">{error}</div>
			<button
				type="button"
				on:click={loadLogbook}
				class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
			>
				Retry
			</button>
		</div>
	{:else if logbookEntries.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-500">
				<p class="text-lg font-medium">No logbook entries found</p>
				<p class="mt-1 text-sm">
					{selectedDate || selectedVehicleId
						? 'Try adjusting your filters to see more entries'
						: 'Entries will appear here as drivers complete deliveries'}
				</p>
			</div>
		</div>
	{:else}
		<div class="space-y-6">
			{#each sortedDates as date}
				<div class="bg-white shadow overflow-hidden sm:rounded-lg">
					<div class="bg-gray-50 px-4 py-5 sm:px-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900">
							{formatDate(groupedEntries[date][0].timestamp)}
						</h3>
						<p class="mt-1 max-w-2xl text-sm text-gray-500">
							{groupedEntries[date].length} event{groupedEntries[date].length !== 1 ? 's' : ''}
						</p>
					</div>
					<div class="border-t border-gray-200">
						<dl>
							{#each groupedEntries[date] as entry, index}
								<div
									class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 {index % 2 === 1
										? 'bg-gray-50'
										: ''}"
								>
									<dt class="text-sm font-medium text-gray-500 flex items-center">
										<Clock class="h-4 w-4 mr-2" />
										{formatTime(entry.timestamp)}
									</dt>
									<dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
										<div class="flex items-start justify-between">
											<div class="flex-grow">
												<div class="font-medium">{entry.event}</div>
												<div class="mt-1 text-gray-500">
													Order #{entry.orderId}
												</div>
												<div class="mt-1 text-gray-500">
													{entry.address}
												</div>
											</div>
											<div class="ml-4 flex-shrink-0 text-right">
												<div class="text-sm font-medium text-gray-900">
													{entry.driverName}
												</div>
												<div class="mt-1 text-sm text-gray-500 flex items-center">
													<Truck class="h-3 w-3 mr-1" />
													{getVehicleName(entry.vehicleLicensePlate)}
												</div>
											</div>
										</div>
									</dd>
								</div>
							{/each}
						</dl>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
