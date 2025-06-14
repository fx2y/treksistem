<script lang="ts">
	import { wizardStore, wizardActions } from '$lib/state/wizardStore.js';
	import { apiClient } from '$lib/services/apiClient.js';

	let isSubmitting = false;
	let error = '';

	async function handleSubmit() {
		if (isSubmitting) return;

		const { name, baseFee, feePerKm } = $wizardStore.serviceData;

		if (!name.trim()) {
			error = 'Service name is required';
			return;
		}

		if (baseFee <= 0) {
			error = 'Base fee must be greater than 0';
			return;
		}

		if (feePerKm <= 0) {
			error = 'Fee per km must be greater than 0';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			await apiClient.createService({
				name: name.trim(),
				baseFee,
				feePerKm
			});

			wizardActions.nextStep();
		} catch (err) {
			console.error('Failed to create service:', err);
			error = 'Failed to create service. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleInputChange(field: string, value: string | number) {
		wizardActions.updateServiceData({ [field]: value });
		if (error) error = '';
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(value);
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-semibold text-gray-900 mb-2">Create Your First Service</h3>
		<p class="text-gray-600">Set up a delivery service that customers can book.</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<div>
			<label for="serviceName" class="block text-sm font-medium text-gray-700 mb-1">
				Service Name *
			</label>
			<input
				id="serviceName"
				type="text"
				required
				value={$wizardStore.serviceData.name}
				on:input={(e) => handleInputChange('name', e.currentTarget.value)}
				placeholder="e.g., Food Delivery, Package Delivery"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
          focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label for="baseFee" class="block text-sm font-medium text-gray-700 mb-1">
					Base Fee (IDR) *
				</label>
				<input
					id="baseFee"
					type="number"
					required
					min="1000"
					step="1000"
					value={$wizardStore.serviceData.baseFee || ''}
					on:input={(e) => handleInputChange('baseFee', parseInt(e.currentTarget.value) || 0)}
					placeholder="5000"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				{#if $wizardStore.serviceData.baseFee > 0}
					<p class="text-xs text-gray-500 mt-1">
						{formatCurrency($wizardStore.serviceData.baseFee)}
					</p>
				{/if}
			</div>

			<div>
				<label for="feePerKm" class="block text-sm font-medium text-gray-700 mb-1">
					Fee per KM (IDR) *
				</label>
				<input
					id="feePerKm"
					type="number"
					required
					min="500"
					step="500"
					value={$wizardStore.serviceData.feePerKm || ''}
					on:input={(e) => handleInputChange('feePerKm', parseInt(e.currentTarget.value) || 0)}
					placeholder="2000"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				{#if $wizardStore.serviceData.feePerKm > 0}
					<p class="text-xs text-gray-500 mt-1">
						{formatCurrency($wizardStore.serviceData.feePerKm)} per km
					</p>
				{/if}
			</div>
		</div>

		<!-- Preview -->
		{#if $wizardStore.serviceData.baseFee > 0 && $wizardStore.serviceData.feePerKm > 0}
			<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<h4 class="text-sm font-medium text-blue-900 mb-2">Pricing Preview</h4>
				<div class="space-y-1 text-sm text-blue-800">
					<p>
						5 km delivery: {formatCurrency(
							$wizardStore.serviceData.baseFee + $wizardStore.serviceData.feePerKm * 5
						)}
					</p>
					<p>
						10 km delivery: {formatCurrency(
							$wizardStore.serviceData.baseFee + $wizardStore.serviceData.feePerKm * 10
						)}
					</p>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="p-3 bg-red-50 border border-red-200 rounded-lg">
				<p class="text-sm text-red-600">{error}</p>
			</div>
		{/if}

		<div class="bg-gray-50 p-4 rounded-lg">
			<p class="text-sm text-gray-600">
				💡 <strong>Tip:</strong> You can create more services and configure advanced options later from
				the services page.
			</p>
		</div>

		<button
			type="submit"
			disabled={isSubmitting ||
				!$wizardStore.serviceData.name.trim() ||
				$wizardStore.serviceData.baseFee <= 0 ||
				$wizardStore.serviceData.feePerKm <= 0}
			class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			{isSubmitting ? 'Creating Service...' : 'Create Service & Continue'}
		</button>
	</form>
</div>
