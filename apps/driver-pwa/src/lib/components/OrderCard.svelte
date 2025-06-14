<script lang="ts">
  import type { DriverOrder } from '../services/apiClient';
  import { Svelte } from '@treksistem/ui';
  const { Card, Button } = Svelte;

  export let order: DriverOrder;
  export let onClaim: (orderId: string) => Promise<void>;
  export let onViewDetails: (order: DriverOrder) => void;

  let claiming = false;

  async function handleClaim() {
    if (claiming) return;
    
    try {
      claiming = true;
      await onClaim(order.id);
    } catch (error) {
      console.error('Failed to claim order:', error);
    } finally {
      claiming = false;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending_dispatch':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'pickup':
        return 'bg-orange-100 text-orange-800';
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
</script>

<Card padding="md">
  <div class="flex justify-between items-start mb-3">
    <div>
      <h3 class="font-semibold text-gray-900">Order #{order.publicId.slice(-8)}</h3>
      <span class="px-2 py-1 rounded-full text-xs font-medium {getStatusColor(order.status)}">
        {order.status.replace('_', ' ').toUpperCase()}
      </span>
    </div>
    <div class="text-right">
      <div class="text-sm text-gray-600">Estimated</div>
      <div class="font-semibold text-green-600">
        Rp {order.estimatedCost.toLocaleString('id-ID')}
      </div>
    </div>
  </div>

  <div class="mb-3">
    <div class="text-sm text-gray-600 mb-1">Customer</div>
    <div class="font-medium">{order.ordererName}</div>
    {#if order.recipientName !== order.ordererName}
      <div class="text-sm text-gray-600">Recipient: {order.recipientName}</div>
    {/if}
  </div>

  <div class="mb-4">
    <div class="text-sm text-gray-600 mb-2">Route ({order.stops.length} stops)</div>
    <div class="space-y-1">
      {#each order.stops.slice(0, 2) as stop}
        <div class="flex items-center gap-2 text-sm">
          <div class="w-2 h-2 rounded-full {stop.type === 'pickup' ? 'bg-green-500' : 'bg-red-500'}"></div>
          <span class="text-gray-700">{stop.address.length > 40 ? stop.address.slice(0, 40) + '...' : stop.address}</span>
        </div>
      {/each}
      {#if order.stops.length > 2}
        <div class="text-xs text-gray-500 ml-4">+{order.stops.length - 2} more stops</div>
      {/if}
    </div>
  </div>

  <div class="flex gap-2">
    {#if order.status === 'pending_dispatch'}
      <Button
        variant="primary"
        size="md"
        disabled={claiming}
        on:click={handleClaim}
        class="flex-1"
      >
        {claiming ? 'Claiming...' : 'Accept Order'}
      </Button>
    {:else}
      <Button
        variant="secondary"
        size="md"
        on:click={() => onViewDetails(order)}
        class="flex-1"
      >
        View Details
      </Button>
    {/if}
  </div>
</Card>