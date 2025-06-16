<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/authStore';
  import { apiClient } from '$lib/services/apiClient';
  import type { DriverOrder } from '$lib/services/apiClient';
  import PhotoReportModal from '$lib/components/PhotoReportModal.svelte';
  import { Svelte } from '@treksistem/ui';
  
  const { Button, Card, Badge } = Svelte;

  $: auth = $authStore;
  $: orderId = $page.params.orderId;

  let order: DriverOrder | null = null;
  let loading = true;
  let error = '';
  let showPhotoModal = false;
  let currentStage: 'pickup' | 'dropoff' = 'pickup';
  let processingStopId = '';

  onMount(async () => {
    if (!auth.isAuthenticated) {
      await goto('/');
      return;
    }
    await loadOrder();
  });

  async function loadOrder() {
    try {
      loading = true;
      error = '';
      // Get order details from active orders
      const activeOrders = await apiClient.getOrders(auth.selectedMitraId || undefined);
      order = activeOrders.find(o => o.publicId === orderId || o.id === orderId) || null;
      
      if (!order) {
        error = 'Order not found or not assigned to you';
      }
    } catch (err) {
      console.error('Failed to load order:', err);
      error = 'Failed to load order details';
    } finally {
      loading = false;
    }
  }

  async function handleCompleteStop(stopId: string, stopType: 'pickup' | 'dropoff') {
    try {
      // Mark stop as completed first
      await apiClient.post(`/driver/orders/${order!.id}/stops/${stopId}/complete`);
      
      // Open photo modal for documentation
      processingStopId = stopId;
      currentStage = stopType;
      showPhotoModal = true;
    } catch (err) {
      console.error('Failed to complete stop:', err);
      error = 'Failed to complete stop';
    }
  }

  async function handlePhotoReport(data: { notes: string; photoUrl: string }) {
    try {
      // Submit the photo report
      await apiClient.submitReport(order!.id, {
        stage: currentStage,
        notes: data.notes,
        photoUrl: data.photoUrl
      });

      // Reload order to get updated status
      await loadOrder();
      
      showPhotoModal = false;
      processingStopId = '';
    } catch (err) {
      console.error('Failed to submit report:', err);
      error = 'Failed to submit photo report';
    }
  }

  function getStopStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStopIcon(type: 'pickup' | 'dropoff', status: string) {
    if (status === 'completed') {
      return '✅';
    }
    return type === 'pickup' ? '📦' : '🚚';
  }

  function getOrderStatusColor(status: string) {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'pickup':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
      case 'claimed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  $: sortedStops = order?.stops.sort((a, b) => a.sequence - b.sequence) || [];
  $: nextIncompleteStop = sortedStops.find(stop => stop.status !== 'completed');
  $: allStopsCompleted = sortedStops.every(stop => stop.status === 'completed');
</script>

<svelte:head>
  <title>Order #{order?.publicId || orderId} - Driver</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-4xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <Button 
            on:click={() => goto('/')}
            variant="ghost"
            size="sm"
          >
            ← Back
          </Button>
          <div>
            <h1 class="text-xl font-bold text-gray-900">
              Order #{order?.publicId || orderId}
            </h1>
            {#if order}
              <div class="flex items-center space-x-2 mt-1">
                <Badge class={getOrderStatusColor(order.status)}>
                  {order.status.replace('_', ' ')}
                </Badge>
                <span class="text-sm text-gray-500">
                  {order.stops.length} stop{order.stops.length !== 1 ? 's' : ''}
                </span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-4xl mx-auto px-4 py-6">
    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500">Loading order details...</p>
      </div>
    {:else if error}
      <Card class="mb-4 bg-red-50 border-red-200">
        <p class="text-red-800">{error}</p>
        <Button 
          on:click={loadOrder}
          variant="outline"
          size="sm"
          class="mt-2"
        >
          Retry
        </Button>
      </Card>
    {:else if !order}
      <div class="text-center py-12">
        <div class="text-gray-500">
          <p class="text-lg font-medium mb-2">Order not found</p>
          <p class="text-sm">This order may not be assigned to you or may not exist.</p>
          <Button 
            on:click={() => goto('/')}
            variant="primary"
            class="mt-4"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    {:else}
      <!-- Order Summary -->
      <Card class="mb-6">
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
              <div class="space-y-2">
                <div>
                  <span class="text-sm font-medium text-gray-500">Orderer:</span>
                  <span class="text-sm text-gray-900 ml-2">{order.ordererName}</span>
                </div>
                <div>
                  <span class="text-sm font-medium text-gray-500">Recipient:</span>
                  <span class="text-sm text-gray-900 ml-2">{order.recipientName}</span>
                </div>
                <div>
                  <span class="text-sm font-medium text-gray-500">Estimated Cost:</span>
                  <span class="text-sm text-gray-900 ml-2">
                    Rp {order.estimatedCost.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-3">Progress</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500">Completed stops:</span>
                  <span class="text-sm font-medium text-gray-900">
                    {sortedStops.filter(s => s.status === 'completed').length} / {sortedStops.length}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style="width: {(sortedStops.filter(s => s.status === 'completed').length / sortedStops.length) * 100}%"
                  ></div>
                </div>
                {#if allStopsCompleted}
                  <p class="text-sm text-green-600 font-medium">🎉 All stops completed!</p>
                {:else if nextIncompleteStop}
                  <p class="text-sm text-blue-600">
                    Next: {nextIncompleteStop.type} at {nextIncompleteStop.address}
                  </p>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Delivery Stops -->
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">Delivery Stops</h2>
        
        {#each sortedStops as stop, index (stop.id)}
          <Card class="overflow-hidden">
            <div class="p-6">
              <div class="flex items-start justify-between">
                <div class="flex items-start space-x-4 flex-grow">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                      {getStopIcon(stop.type, stop.status)}
                    </div>
                  </div>
                  
                  <div class="flex-grow">
                    <div class="flex items-center space-x-3 mb-2">
                      <h3 class="text-base font-medium text-gray-900">
                        Stop {stop.sequence}: {stop.type === 'pickup' ? 'Pickup' : 'Delivery'}
                      </h3>
                      <Badge class={getStopStatusColor(stop.status)}>
                        {stop.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p class="text-sm text-gray-600 mb-3">{stop.address}</p>
                    
                    <div class="text-xs text-gray-500">
                      <span>Lat: {stop.lat.toFixed(6)}, Lng: {stop.lng.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex-shrink-0 ml-4">
                  {#if stop.status === 'completed'}
                    <div class="text-green-600 text-sm font-medium">
                      ✓ Completed
                    </div>
                  {:else if stop.id === nextIncompleteStop?.id}
                    <Button 
                      on:click={() => handleCompleteStop(stop.id, stop.type)}
                      variant="primary"
                      size="sm"
                      disabled={processingStopId === stop.id}
                    >
                      {processingStopId === stop.id ? 'Processing...' : 'Complete Stop'}
                    </Button>
                  {:else}
                    <div class="text-gray-400 text-sm">
                      Waiting...
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </Card>
        {/each}
      </div>

      <!-- Next Steps -->
      {#if allStopsCompleted}
        <Card class="mt-6 bg-green-50 border-green-200">
          <div class="p-6 text-center">
            <h3 class="text-lg font-medium text-green-900 mb-2">
              🎉 Delivery Complete!
            </h3>
            <p class="text-green-700 mb-4">
              You have successfully completed all stops for this order.
            </p>
            <Button 
              on:click={() => goto('/')}
              variant="primary"
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      {:else if nextIncompleteStop}
        <Card class="mt-6 bg-blue-50 border-blue-200">
          <div class="p-6">
            <h3 class="text-lg font-medium text-blue-900 mb-2">
              Next Stop
            </h3>
            <p class="text-blue-700 mb-4">
              Proceed to <strong>{nextIncompleteStop.type}</strong> at:
              <br />
              <span class="font-mono text-sm">{nextIncompleteStop.address}</span>
            </p>
            <div class="flex space-x-3">
              <Button 
                on:click={() => {
                  const url = `https://maps.google.com/?q=${nextIncompleteStop.lat},${nextIncompleteStop.lng}`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                size="sm"
              >
                📍 Open in Maps
              </Button>
              <Button 
                on:click={() => handleCompleteStop(nextIncompleteStop.id, nextIncompleteStop.type)}
                variant="primary"
                size="sm"
                disabled={processingStopId === nextIncompleteStop.id}
              >
                {processingStopId === nextIncompleteStop.id ? 'Processing...' : 'Complete This Stop'}
              </Button>
            </div>
          </div>
        </Card>
      {/if}
    {/if}
  </div>
</div>

<!-- Photo Report Modal -->
<PhotoReportModal
  bind:open={showPhotoModal}
  stage={currentStage}
  onSubmit={handlePhotoReport}
/>