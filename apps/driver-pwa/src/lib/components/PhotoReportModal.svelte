<script lang="ts">
  import { Modal } from '@treksistem/ui/svelte';
  
  export let open = false;
  export let stage: 'pickup' | 'dropoff' = 'pickup';
  export let onSubmit: (data: { notes: string; photoUrl: string }) => Promise<void>;
  
  let isSubmitting = false;
  let notes = '';
  let selectedFile: File | null = null;
  let previewUrl = '';
  let error = '';
  
  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      error = 'Please select an image file';
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error = 'File size must be less than 5MB';
      return;
    }
    
    selectedFile = file;
    error = '';
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  async function uploadFile(file: File): Promise<string> {
    // Step 1: Request upload URL from our API
    const response = await fetch('/api/uploads/request-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        fileName: `report-${Date.now()}-${file.name}`,
        contentType: file.type
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    
    const { signedUrl, publicUrl } = await response.json();
    
    // Step 2: Upload file directly to R2 using signed URL
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }
    
    return publicUrl;
  }
  
  async function handleSubmit() {
    if (!selectedFile) {
      error = 'Please select a photo';
      return;
    }
    
    if (!notes.trim()) {
      error = 'Please add notes';
      return;
    }
    
    try {
      isSubmitting = true;
      error = '';
      
      // Upload photo and get public URL
      const photoUrl = await uploadFile(selectedFile);
      
      // Submit report with photo URL
      await onSubmit({
        notes: notes.trim(),
        photoUrl
      });
      
      // Reset form
      notes = '';
      selectedFile = null;
      previewUrl = '';
      open = false;
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit report';
    } finally {
      isSubmitting = false;
    }
  }
  
  function handleClose() {
    if (!isSubmitting) {
      notes = '';
      selectedFile = null;
      previewUrl = '';
      error = '';
      open = false;
    }
  }
  
  $: stageText = stage === 'pickup' ? 'Pickup' : 'Delivery';
  $: stageEmoji = stage === 'pickup' ? '📦' : '🚚';
</script>

<Modal bind:open size="lg" title="{stageEmoji} {stageText} Report" closable={!isSubmitting}>
  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
    
    <!-- Photo Upload Section -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Photo Evidence <span class="text-red-500">*</span>
      </label>
      
      {#if !previewUrl}
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            on:change={handleFileChange}
            class="hidden"
            id="photo-input"
            disabled={isSubmitting}
          />
          <label 
            for="photo-input" 
            class="cursor-pointer block"
            class:cursor-not-allowed={isSubmitting}
          >
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <p class="text-sm text-gray-600">
              <span class="font-medium text-blue-600 hover:text-blue-500">Click to take photo</span>
              or drag and drop
            </p>
            <p class="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
          </label>
        </div>
      {:else}
        <div class="relative">
          <img 
            src={previewUrl} 
            alt="Report preview" 
            class="w-full max-h-64 object-cover rounded-lg border border-gray-300"
          />
          <button
            type="button"
            on:click={() => {
              selectedFile = null;
              previewUrl = '';
            }}
            disabled={isSubmitting}
            class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            aria-label="Remove photo"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}
    </div>
    
    <!-- Notes Section -->
    <div>
      <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">
        Notes <span class="text-red-500">*</span>
      </label>
      <textarea
        id="notes"
        bind:value={notes}
        placeholder={stage === 'pickup' ? 'Describe the condition of items picked up...' : 'Confirm delivery details...'}
        rows="4"
        disabled={isSubmitting}
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        required
      ></textarea>
      <p class="text-xs text-gray-500 mt-1">
        Provide clear details for accountability and customer confidence
      </p>
    </div>
    
    <!-- Error Message -->
    {#if error}
      <div class="rounded-md bg-red-50 p-4" role="alert">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <p class="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Action Buttons -->
    <div class="flex space-x-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        on:click={handleClose}
        disabled={isSubmitting}
        class="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting || !selectedFile || !notes.trim()}
        class="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {#if isSubmitting}
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Submitting...
        {:else}
          Submit {stageText} Report
        {/if}
      </button>
    </div>
    
  </form>
</Modal>