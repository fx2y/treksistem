<script lang="ts">
  import { locationStore, locationActions } from '../stores/locationStore';

  $: locationState = $locationStore;
  
  function toggleLocation() {
    if (locationState.isActive) {
      locationActions.stopTracking();
    } else {
      locationActions.startTracking();
    }
  }

  function formatTime(date: Date | null) {
    if (!date) return 'Never';
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
</script>

<div class="bg-white rounded-lg shadow-md p-4 border border-gray-200">
  <div class="flex items-center justify-between mb-3">
    <h3 class="font-semibold text-gray-900">Location Tracking</h3>
    <button
      on:click={toggleLocation}
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {locationState.isActive ? 'bg-blue-600' : 'bg-gray-200'}"
    >
      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {locationState.isActive ? 'translate-x-6' : 'translate-x-1'}"></span>
    </button>
  </div>

  <div class="space-y-2 text-sm">
    <div class="flex justify-between">
      <span class="text-gray-600">Status:</span>
      <span class="font-medium {locationState.isActive ? 'text-green-600' : 'text-gray-500'}">
        {locationState.isActive ? 'Active' : 'Inactive'}
      </span>
    </div>

    <div class="flex justify-between">
      <span class="text-gray-600">Last Update:</span>
      <span class="font-medium text-gray-700">
        {formatTime(locationState.lastUpdate)}
      </span>
    </div>

    {#if locationState.currentLocation}
      <div class="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
        Lat: {locationState.currentLocation.lat.toFixed(6)}<br>
        Lng: {locationState.currentLocation.lng.toFixed(6)}
      </div>
    {/if}

    {#if locationState.error}
      <div class="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
        {locationState.error}
      </div>
    {/if}
  </div>

  {#if locationState.isActive}
    <div class="mt-3 text-xs text-gray-500">
      📍 Sharing location every 2 minutes
    </div>
  {/if}
</div>