<script>
	let isLoggedIn = false;
	let currentView = 'login'; // 'login' or 'dashboard'
	
	// Mock login function (in real app, would use OAuth)
	function handleLogin() {
		isLoggedIn = true;
		currentView = 'dashboard';
	}
</script>

<svelte:head>
	<title>Admin Portal - Treksistem</title>
</svelte:head>

{#if !isLoggedIn}
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
			<div class="mt-8 space-y-6">
				<button
					on:click={handleLogin}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					🔐 Login with Google (Mock)
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
		<div class="border-4 border-dashed border-gray-200 rounded-lg p-8">
			<h1 class="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Manual Payment Confirmation -->
				<div class="bg-white overflow-hidden shadow rounded-lg">
					<div class="px-4 py-5 sm:p-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							Manual Payment Confirmation
						</h3>
						<p class="text-sm text-gray-500 mb-4">
							Confirm payments received outside the system (bank transfer, cash, etc.)
						</p>
						
						<form class="space-y-4">
							<div>
								<label for="invoiceId" class="block text-sm font-medium text-gray-700">
									Invoice ID
								</label>
								<input
									type="text"
									id="invoiceId"
									placeholder="e.g., pub_inv01"
									class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								/>
							</div>
							
							<button
								type="button"
								on:click={() => alert('Payment confirmed! In real app, this would call POST /api/admin/invoices/:invoiceId/confirm-payment')}
								class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
							>
								✅ Confirm Payment
							</button>
						</form>
					</div>
				</div>
				
				<!-- Master Data Management -->
				<div class="bg-white overflow-hidden shadow rounded-lg">
					<div class="px-4 py-5 sm:p-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							Master Data Management
						</h3>
						<p class="text-sm text-gray-500 mb-4">
							Manage global categories like vehicle types and payload types
						</p>
						
						<div class="space-y-2">
							<button class="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">
								🚗 Vehicle Types
							</button>
							<button class="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">
								📦 Payload Types
							</button>
							<button class="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">
								🏠 Facilities
							</button>
						</div>
						
						<div class="mt-4 p-3 bg-blue-50 rounded-md">
							<p class="text-xs text-blue-700">
								💡 Showcase: "Let's imagine we've just added 'Makanan Ringan' as a new payload type."
							</p>
						</div>
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