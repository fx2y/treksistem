<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/services/apiClient';
	import type { Order } from '$lib/types';
	import { Clock, Truck, CheckCircle, XCircle } from 'lucide-svelte';

	let orders: Order[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadOrders();
	});

	async function loadOrders() {
		try {
			loading = true;
			const response = await apiClient.get<{ orders: Order[] }>(
				'/mitra/orders',
				new URLSearchParams({ limit: '10' })
			);
			orders = response.orders;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load orders';
		} finally {
			loading = false;
		}
	}

	function getStatusColor(status: Order['status']) {
		switch (status) {
			case 'pending_dispatch':
				return 'bg-yellow-100 text-yellow-800';
			case 'accepted':
			case 'pickup':
				return 'bg-blue-100 text-blue-800';
			case 'in_transit':
				return 'bg-purple-100 text-purple-800';
			case 'delivered':
				return 'bg-green-100 text-green-800';
			case 'cancelled':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getStatusIcon(status: Order['status']) {
		switch (status) {
			case 'pending_dispatch':
				return Clock;
			case 'accepted':
			case 'pickup':
			case 'in_transit':
				return Truck;
			case 'delivered':
				return CheckCircle;
			case 'cancelled':
				return XCircle;
			default:
				return Clock;
		}
	}

	$: activeOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
	$: completedOrders = orders.filter((order) => order.status === 'delivered');
	$: cancelledOrders = orders.filter((order) => order.status === 'cancelled');
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">Overview of your delivery operations</p>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<Clock class="h-6 w-6 text-yellow-400" />
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Active Orders</dt>
							<dd class="text-lg font-medium text-gray-900">{activeOrders.length}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<CheckCircle class="h-6 w-6 text-green-400" />
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Completed Today</dt>
							<dd class="text-lg font-medium text-gray-900">{completedOrders.length}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<XCircle class="h-6 w-6 text-red-400" />
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
							<dd class="text-lg font-medium text-gray-900">{cancelledOrders.length}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Orders -->
	<div class="bg-white shadow overflow-hidden sm:rounded-md">
		<div class="px-4 py-5 sm:px-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900">Recent Orders</h3>
			<p class="mt-1 max-w-2xl text-sm text-gray-500">Latest delivery orders</p>
		</div>

		{#if loading}
			<div class="p-6 text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
				<p class="mt-2 text-sm text-gray-500">Loading orders...</p>
			</div>
		{:else if error}
			<div class="p-6 text-center">
				<div class="text-red-600 text-sm">{error}</div>
				<button
					type="button"
					on:click={loadOrders}
					class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
				>
					Retry
				</button>
			</div>
		{:else if orders.length === 0}
			<div class="p-6 text-center">
				<p class="text-sm text-gray-500">No orders found</p>
			</div>
		{:else}
			<ul class="divide-y divide-gray-200">
				{#each orders as order}
					<li class="px-4 py-4 sm:px-6 hover:bg-gray-50">
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<svelte:component
										this={getStatusIcon(order.status)}
										class="h-5 w-5 text-gray-400"
									/>
								</div>
								<div class="ml-4">
									<div class="text-sm font-medium text-gray-900">
										Order #{order.public_id}
									</div>
									<div class="text-sm text-gray-500">
										{order.ordererName} → {order.recipientName}
									</div>
									<div class="text-sm text-gray-500">
										{order.stops.length} stop{order.stops.length !== 1 ? 's' : ''}
									</div>
								</div>
							</div>
							<div class="flex items-center">
								<div class="mr-4 text-right">
									<div class="text-sm font-medium text-gray-900">
										Rp {order.estimatedCost.toLocaleString('id-ID')}
									</div>
									<div class="text-sm text-gray-500">
										{new Date(order.createdAt).toLocaleDateString('id-ID')}
									</div>
									{#if order.driverName}
										<div class="text-sm text-gray-500">
											Driver: {order.driverName}
										</div>
									{/if}
								</div>
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(
										order.status
									)}"
								>
									{order.status.replace('_', ' ')}
								</span>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
