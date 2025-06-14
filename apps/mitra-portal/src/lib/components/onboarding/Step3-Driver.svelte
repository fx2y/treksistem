<script lang="ts">
	import { wizardStore, wizardActions } from '$lib/state/wizardStore.js';
	import { apiClient } from '$lib/services/apiClient.js';

	let isSubmitting = false;
	let error = '';
	let success = false;

	async function handleSubmit() {
		if (isSubmitting) return;

		const { email } = $wizardStore.driverData;

		if (!email.trim()) {
			error = 'Email is required';
			return;
		}

		if (!isValidEmail(email)) {
			error = 'Please enter a valid email address';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			await apiClient.inviteDriver(email.trim());
			success = true;
		} catch (err) {
			console.error('Failed to invite driver:', err);
			error = 'Failed to send invitation. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleSkip() {
		// Skip driver invitation and proceed to completion
		wizardActions.nextStep();
	}

	function handleInputChange(field: string, value: string) {
		wizardActions.updateDriverData({ [field]: value });
		if (error) error = '';
		if (success) success = false;
	}

	function isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-semibold text-gray-900 mb-2">Invite Your First Driver</h3>
		<p class="text-gray-600">Invite a driver to start fulfilling deliveries for your business.</p>
	</div>

	{#if success}
		<div class="p-4 bg-green-50 border border-green-200 rounded-lg">
			<div class="flex items-start">
				<svg class="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<div>
					<h4 class="text-sm font-medium text-green-900">Invitation Sent!</h4>
					<p class="text-sm text-green-700 mt-1">
						We've sent an invitation to <strong>{$wizardStore.driverData.email}</strong>. They'll
						receive an email with instructions to join your team.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<div>
				<label for="driverEmail" class="block text-sm font-medium text-gray-700 mb-1">
					Driver Email Address
				</label>
				<input
					id="driverEmail"
					type="email"
					value={$wizardStore.driverData.email}
					on:input={(e) => handleInputChange('email', e.currentTarget.value)}
					placeholder="driver@example.com"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<p class="text-xs text-gray-500 mt-1">
					The driver will receive an email invitation to join your team.
				</p>
			</div>

			{#if error}
				<div class="p-3 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-sm text-red-600">{error}</p>
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					type="submit"
					disabled={isSubmitting || !$wizardStore.driverData.email.trim()}
					class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
				</button>

				<button
					type="button"
					on:click={handleSkip}
					class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors
            focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-lg"
				>
					Skip for Now
				</button>
			</div>
		</form>
	{/if}

	<div class="bg-gray-50 p-4 rounded-lg space-y-3">
		<h4 class="text-sm font-medium text-gray-900">What happens next?</h4>
		<ul class="space-y-2 text-sm text-gray-600">
			<li class="flex items-start">
				<span
					class="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-3 mt-0.5"
					>1</span
				>
				The driver receives an email invitation
			</li>
			<li class="flex items-start">
				<span
					class="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-3 mt-0.5"
					>2</span
				>
				They create an account and accept the invitation
			</li>
			<li class="flex items-start">
				<span
					class="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-3 mt-0.5"
					>3</span
				>
				You can start assigning deliveries to them
			</li>
		</ul>
		<p class="text-xs text-gray-500 mt-3">
			💡 You can invite more drivers later from the drivers page.
		</p>
	</div>

	{#if success}
		<button
			type="button"
			on:click={() => wizardActions.nextStep()}
			class="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700
        transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
		>
			Continue to Complete Setup
		</button>
	{/if}
</div>
