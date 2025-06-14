<script lang="ts">
  export let type: 'text' | 'email' | 'password' | 'tel' | 'number' = 'text';
  export let placeholder = '';
  export let value = '';
  export let disabled = false;
  export let required = false;
  export let label = '';
  export let error = '';
  export let id = '';

  const baseClasses = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
  const errorClasses = 'border-red-300 focus:ring-red-500 focus:border-red-500';
</script>

<div class="space-y-1">
  {#if label}
    <label for={id} class="block text-sm font-medium text-gray-700">
      {label}
      {#if required}<span class="text-red-500">*</span>{/if}
    </label>
  {/if}
  
  <input
    {id}
    {type}
    {placeholder}
    {disabled}
    {required}
    bind:value
    class="{baseClasses} {error ? errorClasses : ''}"
    on:input
    on:change
    on:blur
    on:focus
  />
  
  {#if error}
    <p class="text-sm text-red-600">{error}</p>
  {/if}
</div>