<script lang="ts">
	import { wizardStore, wizardActions } from '$lib/state/wizardStore.js';
	import { apiClient } from '$lib/services/apiClient.js';

	let isSubmitting = false;
	let error = '';

	async function handleSubmit() {
		if (isSubmitting) return;

		const { businessName, address, phone } = $wizardStore.profileData;

		if (!businessName.trim()) {
			error = 'Business name is required';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			await apiClient.updateMitraProfile({
				businessName: businessName.trim(),
				address: address.trim() || undefined,
				phone: phone.trim() || undefined
			});

			wizardActions.nextStep();
		} catch (err) {
			console.error('Failed to update profile:', err);
			error = 'Failed to update profile. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleInputChange(field: string, value: string) {
		wizardActions.updateProfileData({ [field]: value });
		if (error) error = '';
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-semibold text-gray-900 mb-2">Business Information</h3>
		<p class="text-gray-600">Let's start with your basic business details.</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<div>
			<label for="businessName" class="block text-sm font-medium text-gray-700 mb-1">
				Business Name *
			</label>
			<input
				id="businessName"
				type="text"
				required
				value={$wizardStore.profileData.businessName}
				on:input={(e) => handleInputChange('businessName', e.currentTarget.value)}
				placeholder="Enter your business name"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
          focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		</div>

		<div>
			<label for="address" class="block text-sm font-medium text-gray-700 mb-1">
				Business Address
			</label>
			<textarea
				id="address"
				rows="3"
				value={$wizardStore.profileData.address}
				on:input={(e) => handleInputChange('address', e.currentTarget.value)}
				placeholder="Enter your business address"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
          focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
			></textarea>
		</div>

		<div>
			<label for="phone" class="block text-sm font-medium text-gray-700 mb-1"> Phone Number </label>
			<input
				id="phone"
				type="tel"
				value={$wizardStore.profileData.phone}
				on:input={(e) => handleInputChange('phone', e.currentTarget.value)}
				placeholder="Enter your phone number"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
          focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		</div>

		{#if error}
			<div class="p-3 bg-red-50 border border-red-200 rounded-lg">
				<p class="text-sm text-red-600">{error}</p>
			</div>
		{/if}

		<button
			type="submit"
			disabled={isSubmitting || !$wizardStore.profileData.businessName.trim()}
			class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			{isSubmitting ? 'Saving...' : 'Save & Continue'}
		</button>
	</form>
</div>
