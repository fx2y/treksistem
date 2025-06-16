<script lang="ts">
	import { onMount } from 'svelte';
	import { adminAuthService } from '$lib/services/authService';
	import { goto } from '$app/navigation';

	let isLoggedIn = false;
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			isLoggedIn = await adminAuthService.initializeAuth();
		} catch (err) {
			console.error('Auth initialization failed:', err);
			isLoggedIn = false;
		} finally {
			loading = false;
		}
	});

	async function handleLogin() {
		try {
			error = '';
			// For demo purposes, simulate login
			window.location.href = '/api/auth/google';
		} catch (err) {
			error = 'Login failed. Please try again.';
			console.error('Login error:', err);
		}
	}

	async function handleLogout() {
		try {
			await adminAuthService.logout();
			isLoggedIn = false;
		} catch (err) {
			console.error('Logout error:', err);
		}
	}

	function navigateTo(path: string) {
		goto(path);
	}
</script>

<svelte:head>
	<title>Admin Portal - Treksistem</title>
</svelte:head>

{#if loading}
	<!-- Loading State -->
	<div class="min-h-[80vh] flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600">Loading...</p>
		</div>
	</div>
{:else if !isLoggedIn}
	<!-- Login Page -->
	<div class="min-h-[80vh] flex items-center justify-center">
		<div class="max-w-md w-full space-y-8">
			<div>
				<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
					Admin Portal Login
				</h2>
				<p class="mt-2 text-center text-sm text-gray-600">
					For showcase purposes only
				</p>
			</div>
			
			{#if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4">
					<p class="text-red-800">{error}</p>
				</div>
			{/if}
			
			<div class="mt-8 space-y-6">
				<button
					on:click={handleLogin}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					🔐 Login with Google
				</button>
				
				<div class="text-center text-xs text-gray-500">
					<p>In a real implementation, this would use Google OAuth</p>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Admin Dashboard -->
	<div class="px-4 py-6 sm:px-0">
		<div class="max-w-6xl mx-auto">
			<div class="flex justify-between items-center mb-6">
				<h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
				<button
					on:click={handleLogout}
					class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
				>
					🚪 Logout
				</button>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Manual Payment Confirmation -->
				<div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
					<div class="px-4 py-5 sm:p-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							💰 Manual Payment Confirmation
						</h3>
						<p class="text-sm text-gray-500 mb-4">
							Confirm payments received outside the system (bank transfer, cash, etc.)
						</p>
						
						<button
							on:click={() => navigateTo('/billing')}
							class="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors font-medium"
						>
							View Pending Invoices →
						</button>
					</div>
				</div>
				
				<!-- Master Data Management -->
				<div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
					<div class="px-4 py-5 sm:p-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							🗂️ Master Data Management
						</h3>
						<p class="text-sm text-gray-500 mb-4">
							Manage global categories like vehicle types and payload types
						</p>
						
						<button
							on:click={() => navigateTo('/master-data')}
							class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
						>
							Manage Categories →
						</button>
					</div>
				</div>
				
				<!-- Mitra Onboarding -->
				<div class="bg-white overflow-hidden shadow rounded-lg">
					<div class="px-4 py-5 sm:p-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							High-Touch Onboarding
						</h3>
						<p class="text-sm text-gray-500 mb-4">
							Onboard new partners with Day-One Value approach
						</p>
						
						<form class="space-y-4">
							<div>
								<label for="mitraEmail" class="block text-sm font-medium text-gray-700">
									Partner Email
								</label>
								<input
									type="email"
									id="mitraEmail"
									value="bu.ani@example.com"
									class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
							
							<div>
								<label for="businessName" class="block text-sm font-medium text-gray-700">
									Business Name
								</label>
								<input
									type="text"
									id="businessName"
									value="Katering Bu Ani"
									class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
							
							<button
								type="button"
								on:click={() => alert('Mitra onboarded! In real app, this would call the admin-on-behalf-of API and set up business profile, service, and invite driver.')}
								class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								🚀 Onboard Partner
							</button>
						</form>
					</div>
				</div>
				
				<!-- Quick Stats -->
				<div class="bg-white overflow-hidden shadow rounded-lg">
					<div class="px-4 py-5 sm:p-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							Platform Overview
						</h3>
						
						<div class="space-y-3">
							<div class="flex justify-between">
								<span class="text-sm text-gray-500">Active Mitras</span>
								<span class="text-sm font-medium">1</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-500">Total Drivers</span>
								<span class="text-sm font-medium">1</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-500">Completed Orders</span>
								<span class="text-sm font-medium">3</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-500">Pending Invoices</span>
								<span class="text-sm font-medium text-orange-600">1</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}