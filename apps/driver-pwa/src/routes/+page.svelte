<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, authActions } from '$lib/stores/authStore';
  import { apiClient } from '$lib/services/apiClient';
  import type { DriverOrder } from '$lib/services/apiClient';
  import OrderCard from '$lib/components/OrderCard.svelte';
  import LocationToggle from '$lib/components/LocationToggle.svelte';
  import MitraSelector from '$lib/components/MitraSelector.svelte';
  import { Svelte } from '@treksistem/ui';
  
  const { Button, Card, Spinner } = Svelte;

  $: auth = $authStore;
  
  let availableOrders: DriverOrder[] = [];
  let activeOrders: DriverOrder[] = [];
  let loadingAvailable = false;
  let loadingActive = false;
  let error = '';
  let activeTab: 'available' | 'active' = 'available';

  onMount(async () => {
    await authActions.initializeAuth();
    if (auth.isAuthenticated) {
      await loadAllOrders();
    }
  });

  // Reactive statement to reload orders when selected Mitra changes
  $: if (auth.selectedMitraId) {
    loadAllOrders();
  }

  async function loadAllOrders() {
    if (!auth.isAuthenticated) return;
    await Promise.all([loadAvailableOrders(), loadActiveOrders()]);
  }

  async function loadAvailableOrders() {
    if (!auth.isAuthenticated) return;

    try {
      loadingAvailable = true;
      error = '';
      availableOrders = await apiClient.getAvailableOrders(auth.selectedMitraId || undefined);
    } catch (err) {
      console.error('Failed to load available orders:', err);
      error = 'Failed to load available orders';
    } finally {
      loadingAvailable = false;
    }
  }

  async function loadActiveOrders() {
    if (!auth.isAuthenticated) return;

    try {
      loadingActive = true;
      error = '';
      activeOrders = await apiClient.getOrders(auth.selectedMitraId || undefined);
    } catch (err) {
      console.error('Failed to load active orders:', err);
      error = 'Failed to load active orders';
    } finally {
      loadingActive = false;
    }
  }

  async function handleClaimOrder(orderId: string) {
    try {
      await apiClient.claimOrder(orderId);
      // Refresh both lists to move the order from available to active
      await loadAllOrders();
      // Switch to active tab to show the claimed order
      activeTab = 'active';
    } catch (err) {
      console.error('Failed to claim order:', err);
      error = 'Failed to claim order';
    }
  }

  async function handleViewOrderDetails(order: DriverOrder) {
    await goto(`/orders/${order.publicId}`);
  }

  async function handleLogout() {
    await authActions.logout();
  }

  function switchTab(tab: 'available' | 'active') {
    activeTab = tab;
  }
</script>

<svelte:head>
  <title>Driver Dashboard - Treksistem</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  {#if !auth.isAuthenticated}
    <div class="flex items-center justify-center min-h-screen">
      <div class="max-w-md w-full mx-4">
        <Card title="Driver Login Required" padding="lg" shadow="lg">
          <p class="text-gray-600 text-center mb-6">Please log in through the authentication system to access the driver dashboard.</p>
          <Button 
            on:click={authActions.loginWithGoogle}
            variant="primary" 
            size="lg" 
            class="w-full text-center block"
          >
            Login with Google
          </Button>
        </Card>
      </div>
    </div>
  {:else}
    <!-- Header -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-xl font-bold text-gray-900">Driver Dashboard</h1>
            <p class="text-sm text-gray-600">Welcome back, {auth.user?.name}</p>
          </div>
          <Button 
            on:click={handleLogout}
            variant="outline"
            size="sm"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Mitra Selector -->
      <MitraSelector />

      <!-- Location Tracking -->
      <div class="mb-6">
        <LocationToggle />
      </div>

      <!-- Orders Section -->
      <div class="mb-6">
        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="-mb-px flex space-x-8">
            <button
              on:click={() => switchTab('available')}
              class="{activeTab === 'available' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Available Orders
              {#if availableOrders.length > 0}
                <span class="bg-blue-100 text-blue-600 ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {availableOrders.length}
                </span>
              {/if}
            </button>
            <button
              on:click={() => switchTab('active')}
              class="{activeTab === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              My Active Orders
              {#if activeOrders.length > 0}
                <span class="bg-green-100 text-green-600 ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {activeOrders.length}
                </span>
              {/if}
            </button>
          </nav>
        </div>

        <!-- Tab Content Header -->
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">
            {activeTab === 'available' ? 'Available Orders' : 'My Active Orders'}
          </h2>
          <Button 
            on:click={activeTab === 'available' ? loadAvailableOrders : loadActiveOrders}
            disabled={activeTab === 'available' ? loadingAvailable : loadingActive}
            variant="ghost"
            size="sm"
          >
            {(activeTab === 'available' ? loadingAvailable : loadingActive) ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {#if error}
          <Card class="mb-4 bg-red-50 border-red-200">
            <p class="text-red-800">{error}</p>
          </Card>
        {/if}

        <!-- Available Orders Tab -->
        {#if activeTab === 'available'}
          {#if loadingAvailable}
            <div class="text-center py-8">
              <div class="inline-flex items-center gap-2 text-gray-600">
                <Spinner size="sm" />
                Loading available orders...
              </div>
            </div>
          {:else if availableOrders.length === 0}
            <div class="text-center py-8">
              <div class="text-gray-500">
                <svg class="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
                <p class="text-lg font-medium mb-2">No orders available</p>
                <p class="text-sm">Check back later for new delivery opportunities</p>
              </div>
            </div>
          {:else}
            <div class="grid gap-4">
              {#each availableOrders as order (order.id)}
                <OrderCard
                  {order}
                  onClaim={handleClaimOrder}
                  onViewDetails={handleViewOrderDetails}
                  showClaimButton={true}
                />
              {/each}
            </div>
          {/if}
        {/if}

        <!-- Active Orders Tab -->
        {#if activeTab === 'active'}
          {#if loadingActive}
            <div class="text-center py-8">
              <div class="inline-flex items-center gap-2 text-gray-600">
                <Spinner size="sm" />
                Loading active orders...
              </div>
            </div>
          {:else if activeOrders.length === 0}
            <div class="text-center py-8">
              <div class="text-gray-500">
                <svg class="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <p class="text-lg font-medium mb-2">No active orders</p>
                <p class="text-sm">Claim an order from the Available tab to get started</p>
              </div>
            </div>
          {:else}
            <div class="grid gap-4">
              {#each activeOrders as order (order.id)}
                <OrderCard
                  {order}
                  onClaim={handleClaimOrder}
                  onViewDetails={handleViewOrderDetails}
                  showClaimButton={false}
                />
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>
