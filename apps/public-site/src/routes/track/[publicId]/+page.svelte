<script lang="ts">
	import type { PageData } from './$types';
	import { formatDistance } from 'date-fns';

	export let data: PageData;
	$: order = data.order;

	function formatTimestamp(timestamp: string) {
		return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending_dispatch':
				return 'text-yellow-600';
			case 'accepted':
				return 'text-blue-600';
			case 'pickup':
				return 'text-orange-600';
			case 'in_transit':
				return 'text-purple-600';
			case 'delivered':
				return 'text-green-600';
			case 'cancelled':
				return 'text-red-600';
			default:
				return 'text-gray-600';
		}
	}
</script>

<svelte:head>
	<title>Track Order {order.publicId} - Treksistem</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-2xl">
	<div class="bg-white rounded-lg shadow-lg p-6">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-gray-900 mb-2">Order Tracking</h1>
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-600">Order ID:</span>
				<span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{order.publicId}</span>
			</div>
		</div>

		<div class="mb-6">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-lg font-semibold">Status:</span>
				<span class="px-3 py-1 rounded-full text-sm font-medium {getStatusColor(order.status)} bg-gray-100">
					{order.status.replace('_', ' ').toUpperCase()}
				</span>
			</div>
			<div class="text-gray-600">
				<span class="font-medium">Estimated Cost:</span>
				Rp {order.estimatedCost.toLocaleString('id-ID')}
			</div>
		</div>

		<div class="mb-6">
			<h2 class="text-lg font-semibold mb-3">Route</h2>
			<div class="space-y-3">
				{#each order.stops as stop, index}
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0">
							{#if stop.type === 'pickup'}
								<div class="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
							{:else}
								<div class="w-3 h-3 bg-red-500 rounded-full mt-1"></div>
							{/if}
						</div>
						<div class="flex-1">
							<div class="font-medium text-sm uppercase text-gray-500 mb-1">
								{stop.type}
							</div>
							<div class="text-gray-900">{stop.address}</div>
						</div>
					</div>
					{#if index < order.stops.length - 1}
						<div class="ml-1.5 w-0.5 h-4 bg-gray-300"></div>
					{/if}
				{/each}
			</div>
		</div>

		{#if order.reports && order.reports.length > 0}
			<div class="mb-6">
				<h2 class="text-lg font-semibold mb-3">Delivery Updates</h2>
				<div class="space-y-4">
					{#each order.reports as report}
						<div class="border-l-4 border-blue-500 pl-4 py-2">
							<div class="flex justify-between items-start mb-1">
								<span class="font-medium text-gray-900">{report.stage}</span>
								<span class="text-sm text-gray-500">{formatTimestamp(report.timestamp)}</span>
							</div>
							{#if report.notes}
								<p class="text-gray-700 text-sm mb-2">{report.notes}</p>
							{/if}
							{#if report.photoUrl}
								<img
									src={report.photoUrl}
									alt="Delivery update"
									class="max-w-full h-auto rounded-lg"
									loading="lazy"
								/>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
</style>