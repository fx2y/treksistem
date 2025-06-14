<script lang="ts">
  export let title = '';
  export let subtitle = '';
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
  export let shadow: 'none' | 'sm' | 'md' | 'lg' = 'md';

  const baseClasses = 'bg-white rounded-lg border border-gray-200';
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };
</script>

<div class="{baseClasses} {paddingClasses[padding]} {shadowClasses[shadow]}">
  {#if title || subtitle}
    <div class="mb-4">
      {#if title}
        <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
      {/if}
      {#if subtitle}
        <p class="text-sm text-gray-600 mt-1">{subtitle}</p>
      {/if}
    </div>
  {/if}
  
  <slot />
</div>