<script lang="ts">
  export let open = false;
  export let title = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let closable = true;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  function closeModal() {
    if (closable) {
      open = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closable) {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    on:click={closeModal}
    role="dialog"
    aria-modal="true"
  >
    <!-- Modal -->
    <div
      class="bg-white rounded-lg shadow-xl {sizeClasses[size]} w-full max-h-screen overflow-y-auto"
      on:click|stopPropagation
    >
      {#if title || closable}
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          {#if title}
            <h2 class="text-xl font-semibold text-gray-900">{title}</h2>
          {/if}
          {#if closable}
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              on:click={closeModal}
            >
              <span class="sr-only">Close</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
      
      <div class="p-6">
        <slot />
      </div>
    </div>
  </div>
{/if}