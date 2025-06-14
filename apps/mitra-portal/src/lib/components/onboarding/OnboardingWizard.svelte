<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { wizardStore, wizardActions } from '$lib/state/wizardStore.js';
	import { apiClient } from '$lib/services/apiClient.js';
	import Step1Profile from './Step1-Profile.svelte';
	import Step2Service from './Step2-Service.svelte';
	import Step3Driver from './Step3-Driver.svelte';

	export let userProfile: import('$lib/types/auth.js').AuthUser;

	const dispatch = createEventDispatcher();

	let isSubmitting = false;

	$: if (userProfile?.mitra && !userProfile.mitra.hasCompletedOnboarding) {
		wizardActions.open();
	}

	function handleClose() {
		wizardActions.close();
	}

	function handleNext() {
		wizardActions.nextStep();
	}

	function handlePrev() {
		wizardActions.prevStep();
	}

	async function handleComplete() {
		if (isSubmitting) return;

		isSubmitting = true;
		try {
			await apiClient.completeOnboarding();
			wizardActions.close();
			dispatch('complete');
		} catch (error) {
			console.error('Failed to complete onboarding:', error);
			// TODO: Show error message
		} finally {
			isSubmitting = false;
		}
	}

	function getStepComponent(step: number) {
		switch (step) {
			case 1:
				return Step1Profile;
			case 2:
				return Step2Service;
			case 3:
				return Step3Driver;
			default:
				return Step1Profile;
		}
	}
</script>

{#if $wizardStore.isOpen}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="p-6 border-b">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold text-gray-900">Setup Your Business</h2>
						<p class="text-gray-600 mt-1">Complete these steps to start using Treksistem</p>
					</div>
					<button
						on:click={handleClose}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Close"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- Progress bar -->
				<div class="mt-4">
					<div class="flex items-center">
						{#each Array.from({ length: $wizardStore.totalSteps }, (_, i) => i) as i}
							<div class="flex items-center">
								<div
									class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    {$wizardStore.currentStep > i + 1
										? 'bg-green-500 text-white'
										: $wizardStore.currentStep === i + 1
											? 'bg-blue-500 text-white'
											: 'bg-gray-300 text-gray-600'}"
								>
									{i + 1}
								</div>
								{#if i < $wizardStore.totalSteps - 1}
									<div
										class="flex-1 h-1 mx-2
                      {$wizardStore.currentStep > i + 1 ? 'bg-green-500' : 'bg-gray-300'}"
									></div>
								{/if}
							</div>
						{/each}
					</div>
					<div class="flex justify-between mt-2 text-sm text-gray-600">
						<span>Profile</span>
						<span>Service</span>
						<span>Driver</span>
					</div>
				</div>
			</div>

			<!-- Content -->
			<div class="p-6">
				<svelte:component this={getStepComponent($wizardStore.currentStep)} />
			</div>

			<!-- Footer -->
			<div class="p-6 border-t bg-gray-50 flex justify-between">
				<button
					on:click={handlePrev}
					disabled={$wizardStore.currentStep === 1}
					class="px-4 py-2 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
            hover:text-gray-800 transition-colors"
				>
					Previous
				</button>

				<div class="flex gap-3">
					{#if $wizardStore.currentStep < $wizardStore.totalSteps}
						<button
							on:click={handleNext}
							class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							Next
						</button>
					{:else}
						<button
							on:click={handleComplete}
							disabled={isSubmitting}
							class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                focus:outline-none focus:ring-2 focus:ring-green-500"
						>
							{isSubmitting ? 'Completing...' : 'Complete Setup'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
