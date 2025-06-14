<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
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

  let modalElement: HTMLDivElement;
  let previousActiveElement: HTMLElement | null = null;
  let focusableElements: NodeListOf<HTMLElement> | null = null;
  let firstFocusableElement: HTMLElement | null = null;
  let lastFocusableElement: HTMLElement | null = null;

  function closeModal() {
    if (closable) {
      open = false;
      // Restore focus to the element that opened the modal
      if (previousActiveElement) {
        previousActiveElement.focus();
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closable) {
      closeModal();
    } else if (event.key === 'Tab' && open) {
      // Focus trapping
      if (!focusableElements || focusableElements.length === 0) return;
      
      if (event.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === firstFocusableElement) {
          event.preventDefault();
          lastFocusableElement?.focus();
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === lastFocusableElement) {
          event.preventDefault();
          firstFocusableElement?.focus();
        }
      }
    }
  }

  function updateFocusableElements() {
    if (!modalElement) return;
    
    focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusableElement = focusableElements[0] || null;
    lastFocusableElement = focusableElements[focusableElements.length - 1] || null;
  }

  $: if (open) {
    // Store the currently focused element
    previousActiveElement = document.activeElement as HTMLElement;
    
    // Use setTimeout to ensure the modal is rendered before focusing
    setTimeout(() => {
      updateFocusableElements();
      // Focus the first focusable element or the modal itself
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      } else if (modalElement) {
        modalElement.focus();
      }
    }, 0);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    on:click={closeModal}
    aria-hidden="true"
  >
    <!-- Modal -->
    <div
      bind:this={modalElement}
      class="bg-white rounded-lg shadow-xl {sizeClasses[size]} w-full max-h-screen overflow-y-auto"
      on:click|stopPropagation
      on:keydown={() => {}}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby="modal-content"
      tabindex="-1"
    >
      {#if title || closable}
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          {#if title}
            <h2 id="modal-title" class="text-xl font-semibold text-gray-900">{title}</h2>
          {/if}
          {#if closable}
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
              on:click={closeModal}
              aria-label="Close modal"
            >
              <span class="sr-only">Close</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
      
      <div id="modal-content" class="p-6">
        <slot />
      </div>
    </div>
  </div>
{/if}