<script lang="ts">
  import { authStore, authActions } from '../stores/authStore';

  $: auth = $authStore;
  $: mitras = auth.user?.driverForMitras || [];
  $: showSelector = mitras.length > 1;

  function handleMitraChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    authActions.selectMitra(select.value);
  }
</script>

{#if showSelector}
  <div class="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-4">
    <label for="mitra-select" class="block text-sm font-medium text-gray-700 mb-2">
      Working for:
    </label>
    <select
      id="mitra-select"
      value={auth.selectedMitraId || ''}
      on:change={handleMitraChange}
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      {#each mitras as mitra}
        <option value={mitra.id}>{mitra.businessName}</option>
      {/each}
    </select>
  </div>
{:else if mitras.length === 1}
  <div class="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-4">
    <div class="text-sm text-blue-800">
      Working for: <span class="font-medium">{mitras[0].businessName}</span>
    </div>
  </div>
{/if}