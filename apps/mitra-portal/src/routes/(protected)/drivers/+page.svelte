<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/services/apiClient';
	import type { Driver } from '$lib/types';
	import { UserPlus, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-svelte';

	let drivers: Driver[] = [];
	let loading = true;
	let error = '';
	let inviting = false;
	let inviteEmail = '';
	let inviteError = '';
	let inviteSuccess = '';
	
	// Subscription status
	let canInviteDrivers = true;
	let subscriptionMessage = '';

	onMount(async () => {
		await loadDrivers();
		await checkSubscriptionStatus();
	});

	async function loadDrivers() {
		try {
			loading = true;
			drivers = await apiClient.get<Driver[]>('/mitra/drivers');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load drivers';
		} finally {
			loading = false;
		}
	}

	async function checkSubscriptionStatus() {
		try {
			// This would check the Mitra's subscription status and driver limit
			// For now, we'll simulate the response
			const response = await apiClient.get<{
				canInviteDrivers: boolean;
				currentDriverCount: number;
				driverLimit: number;
				subscriptionStatus: string;
			}>('/mitra/subscription-status');
			
			canInviteDrivers = response.canInviteDrivers;
			
			if (!canInviteDrivers) {
				subscriptionMessage = `Driver limit reached (${response.currentDriverCount}/${response.driverLimit}). Please contact admin to upgrade your subscription.`;
			}
		} catch (err) {
			// If endpoint doesn't exist yet, assume we can invite
			canInviteDrivers = true;
		}
	}

	async function handleInviteDriver() {
		if (!inviteEmail.trim()) {
			inviteError = 'Email is required';
			return;
		}

		try {
			inviting = true;
			inviteError = '';
			inviteSuccess = '';

			const response = await apiClient.post<{ inviteLink: string }>('/mitra/drivers/invite', {
				email: inviteEmail.trim()
			});

			inviteSuccess = `Invitation sent to ${inviteEmail}`;
			inviteEmail = '';
			
			// Refresh drivers list and subscription status
			await loadDrivers();
			await checkSubscriptionStatus();
		} catch (err) {
			inviteError = err instanceof Error ? err.message : 'Failed to send invitation';
		} finally {
			inviting = false;
		}
	}

	async function removeDriver(driverId: string) {
		if (!confirm('Are you sure you want to remove this driver?')) {
			return;
		}

		try {
			await apiClient.del(`/mitra/drivers/${driverId}`);
			drivers = drivers.filter(d => d.id !== driverId);
			
			// Check subscription status again as we now have fewer drivers
			await checkSubscriptionStatus();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove driver';
		}
	}

	function getStatusColor(status: Driver['status']) {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800';
			case 'on_duty':
				return 'bg-blue-100 text-blue-800';
			case 'inactive':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getStatusIcon(status: Driver['status']) {
		switch (status) {
			case 'active':
				return CheckCircle;
			case 'on_duty':
				return Clock;
			case 'inactive':
				return AlertCircle;
			default:
				return AlertCircle;
		}
	}
</script>

<div class="space-y-6">
	<div class="sm:flex sm:items-center">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-bold text-gray-900">Drivers</h1>
			<p class="mt-1 text-sm text-gray-500">
				Manage your team of delivery drivers
			</p>
		</div>
	</div>

	<!-- Subscription Status Warning -->
	{#if !canInviteDrivers && subscriptionMessage}
		<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<AlertCircle class="h-5 w-5 text-yellow-400" />
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-yellow-800">
						Driver Limit Reached
					</h3>
					<div class="mt-2 text-sm text-yellow-700">
						<p>{subscriptionMessage}</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Invite Driver Form -->
	{#if canInviteDrivers}
		<div class="bg-white shadow sm:rounded-lg">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="text-lg leading-6 font-medium text-gray-900">Invite New Driver</h3>
				<div class="mt-2 max-w-xl text-sm text-gray-500">
					<p>Send an invitation email to a new driver to join your team.</p>
				</div>
				<form on:submit|preventDefault={handleInviteDriver} class="mt-5 sm:flex sm:items-center">
					<div class="w-full sm:max-w-xs">
						<label for="email" class="sr-only">Email</label>
						<input
							type="email"
							id="email"
							bind:value={inviteEmail}
							class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							placeholder="Enter driver's email"
							required
						/>
					</div>
					<button
						type="submit"
						disabled={inviting}
						class="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
					>
						{#if inviting}
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
						{:else}
							<UserPlus class="h-4 w-4 mr-2" />
						{/if}
						Send Invitation
					</button>
				</form>
				
				{#if inviteError}
					<div class="mt-3 text-sm text-red-600">{inviteError}</div>
				{/if}
				
				{#if inviteSuccess}
					<div class="mt-3 text-sm text-green-600">{inviteSuccess}</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Drivers List -->
	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-sm text-gray-500">Loading drivers...</p>
		</div>
	{:else if error}
		<div class="text-center py-12">
			<div class="text-red-600 text-sm">{error}</div>
			<button
				type="button"
				on:click={loadDrivers}
				class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
			>
				Retry
			</button>
		</div>
	{:else if drivers.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-500">
				<p class="text-lg font-medium">No drivers yet</p>
				<p class="mt-1 text-sm">Get started by inviting your first driver</p>
			</div>
		</div>
	{:else}
		<div class="bg-white shadow overflow-hidden sm:rounded-md">
			<ul class="divide-y divide-gray-200">
				{#each drivers as driver}
					<li class="px-6 py-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
										<span class="text-gray-600 font-medium">
											{driver.name.charAt(0).toUpperCase()}
										</span>
									</div>
								</div>
								<div class="ml-4">
									<div class="flex items-center">
										<h3 class="text-lg font-medium text-gray-900">
											{driver.name}
										</h3>
										<svelte:component this={getStatusIcon(driver.status)} class="ml-2 h-4 w-4 text-gray-400" />
									</div>
									<div class="mt-1 text-sm text-gray-500">
										{driver.email}
									</div>
								</div>
							</div>
							<div class="flex items-center space-x-2">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(driver.status)}">
									{driver.status.replace('_', ' ')}
								</span>
								<button
									type="button"
									on:click={() => removeDriver(driver.id)}
									class="inline-flex items-center p-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
									title="Remove Driver"
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