<script lang="ts">
	import type { PageData } from './$types';
	import { MitraProfileClientService } from '$lib/services/mitraProfileService';
	import type { UpdateMitraProfile } from '$lib/types';
	import { Save, User } from 'lucide-svelte';

	export let data: PageData;

	let submitting = false;
	let error = '';
	let success = '';

	// Form state initialized with loaded data
	let formData: UpdateMitraProfile = {
		businessName: data.profile.businessName,
		address: data.profile.address || '',
		phone: data.profile.phone || ''
	};

	async function handleSubmit() {
		if (!formData.businessName.trim()) {
			error = 'Business name is required';
			return;
		}

		if (formData.businessName.trim().length < 3) {
			error = 'Business name must be at least 3 characters';
			return;
		}

		try {
			submitting = true;
			error = '';
			success = '';

			const updateData: UpdateMitraProfile = {
				businessName: formData.businessName.trim(),
				address: formData.address?.trim() || undefined,
				phone: formData.phone?.trim() || undefined
			};

			await MitraProfileClientService.updateProfile(updateData);
			success = 'Profile updated successfully';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update profile';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center space-x-4">
		<div class="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white">
			<User class="h-4 w-4" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Profile Settings</h1>
			<p class="mt-1 text-sm text-gray-500">
				Manage your business profile information
			</p>
		</div>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="space-y-6">
		<div class="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
			<div class="md:grid md:grid-cols-3 md:gap-6">
				<div class="md:col-span-1">
					<h3 class="text-lg font-medium leading-6 text-gray-900">Business Information</h3>
					<p class="mt-1 text-sm text-gray-500">
						Update your business name, address, and contact information
					</p>
				</div>
				<div class="mt-5 md:mt-0 md:col-span-2">
					<div class="grid grid-cols-6 gap-6">
						<div class="col-span-6">
							<label for="businessName" class="block text-sm font-medium text-gray-700">
								Business Name *
							</label>
							<input
								type="text"
								id="businessName"
								bind:value={formData.businessName}
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="Enter your business name"
								required
								minlength="3"
							/>
						</div>

						<div class="col-span-6">
							<label for="address" class="block text-sm font-medium text-gray-700">
								Address
							</label>
							<textarea
								id="address"
								bind:value={formData.address}
								rows="3"
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="Enter your business address"
							></textarea>
						</div>

						<div class="col-span-6 sm:col-span-3">
							<label for="phone" class="block text-sm font-medium text-gray-700">
								Phone Number
							</label>
							<input
								type="tel"
								id="phone"
								bind:value={formData.phone}
								class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="Enter your phone number"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>

		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
				{error}
			</div>
		{/if}

		{#if success}
			<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
				{success}
			</div>
		{/if}

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={submitting}
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
			>
				{#if submitting}
					<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
				{:else}
					<Save class="h-4 w-4 mr-2" />
				{/if}
				Update Profile
			</button>
		</div>
	</form>
</div>