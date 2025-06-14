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

<div class="bg-white rounded-lg shadow-md p-4 border border-gray-200" role="region" aria-labelledby="location-heading">
  <div class="flex items-center justify-between mb-3">
    <h3 id="location-heading" class="font-semibold text-gray-900">Location Tracking</h3>
    <button
      on:click={toggleLocation}
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {locationState.isActive ? 'bg-blue-600' : 'bg-gray-200'}"
      role="switch"
      aria-checked={locationState.isActive}
      aria-labelledby="location-heading"
      aria-describedby="location-status"
    >
      <span class="sr-only">
        {locationState.isActive ? 'Turn off location tracking' : 'Turn on location tracking'}
      </span>
      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {locationState.isActive ? 'translate-x-6' : 'translate-x-1'}" aria-hidden="true"></span>
    </button>
  </div>

  <div class="space-y-2 text-sm">
    <div id="location-status" class="flex justify-between">
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
      <div 
        class="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200"
        role="alert"
        aria-live="polite"
      >
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