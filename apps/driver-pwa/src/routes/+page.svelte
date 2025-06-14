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
  
  let orders: DriverOrder[] = [];
  let loading = false;
  let error = '';

  onMount(async () => {
    await loadUser();
    if (auth.isAuthenticated) {
      await loadOrders();
    }
  });

  // Reactive statement to reload orders when selected Mitra changes
  $: if (auth.selectedMitraId) {
    loadOrders();
  }

  async function loadUser() {
    try {
      const user = await apiClient.getMe();
      authActions.login(user);
    } catch (err) {
      console.error('Failed to load user:', err);
      error = 'Please log in to continue';
    }
  }

  async function loadOrders() {
    if (!auth.isAuthenticated) return;

    try {
      loading = true;
      error = '';
      orders = await apiClient.getOrders(auth.selectedMitraId || undefined);
    } catch (err) {
      console.error('Failed to load orders:', err);
      error = 'Failed to load orders';
    } finally {
      loading = false;
    }
  }

  async function handleClaimOrder(orderId: string) {
    try {
      await apiClient.claimOrder(orderId);
      await loadOrders(); // Refresh the orders list
    } catch (err) {
      console.error('Failed to claim order:', err);
      error = 'Failed to claim order';
    }
  }

  function handleViewOrderDetails(order: DriverOrder) {
    // Navigate to order details page (to be implemented)
    console.log('View order details:', order);
  }

  function handleLogout() {
    apiClient.logout();
    authActions.logout();
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
            href="/api/auth/login" 
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
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Available Orders</h2>
          <Button 
            on:click={loadOrders}
            disabled={loading}
            variant="ghost"
            size="sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {#if error}
          <Card class="mb-4 bg-red-50 border-red-200">
            <p class="text-red-800">{error}</p>
          </Card>
        {/if}

        {#if loading}
          <div class="text-center py-8">
            <div class="inline-flex items-center gap-2 text-gray-600">
              <Spinner size="sm" />
              Loading orders...
            </div>
          </div>
        {:else if orders.length === 0}
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
            {#each orders as order (order.id)}
              <OrderCard
                {order}
                onClaim={handleClaimOrder}
                onViewDetails={handleViewOrderDetails}
              />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
