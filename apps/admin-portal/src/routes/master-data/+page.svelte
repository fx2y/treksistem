<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApiClient } from '$lib/services/apiClient';

	interface MasterDataItem {
		id: string;
		name: string;
		icon?: string;
	}

	let activeCategory = 'vehicle-types';
	let items: MasterDataItem[] = [];
	let loading = false;
	let error = '';
	let showModal = false;
	let editingItem: MasterDataItem | null = null;
	let formData = { name: '', icon: '' };

	const categories = [
		{ key: 'vehicle-types', label: 'Vehicle Types', icon: '🚗' },
		{ key: 'payload-types', label: 'Payload Types', icon: '📦' },
		{ key: 'facilities', label: 'Facilities', icon: '🏠' }
	];

	onMount(() => {
		loadItems();
	});

	async function loadItems() {
		try {
			loading = true;
			error = '';
			const response = await adminApiClient.getMasterData(activeCategory);
			items = response.data;
		} catch (err) {
			error = 'Failed to load items. Please try again.';
			console.error('Error loading items:', err);
		} finally {
			loading = false;
		}
	}

	function switchCategory(category: string) {
		activeCategory = category;
		loadItems();
	}

	function openCreateModal() {
		editingItem = null;
		formData = { name: '', icon: '' };
		showModal = true;
	}

	function openEditModal(item: MasterDataItem) {
		editingItem = item;
		formData = { name: item.name, icon: item.icon || '' };
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingItem = null;
		formData = { name: '', icon: '' };
	}

	async function handleSubmit() {
		if (!formData.name.trim()) {
			error = 'Name is required';
			return;
		}

		try {
			error = '';
			const itemData = {
				name: formData.name.trim(),
				icon: formData.icon.trim() || undefined
			};

			if (editingItem) {
				await adminApiClient.updateMasterDataItem(activeCategory, editingItem.id, itemData);
			} else {
				await adminApiClient.createMasterDataItem(activeCategory, itemData);
			}

			closeModal();
			await loadItems();
		} catch (err) {
			error = editingItem 
				? 'Failed to update item. Please try again.'
				: 'Failed to create item. Please try again.';
			console.error('Error saving item:', err);
		}
	}

	async function handleDelete(item: MasterDataItem) {
		if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
			return;
		}

		try {
			error = '';
			await adminApiClient.deleteMasterDataItem(activeCategory, item.id);
			await loadItems();
		} catch (err) {
			error = 'Failed to delete item. Please try again.';
			console.error('Error deleting item:', err);
		}
	}
</script>

<svelte:head>
	<title>Master Data Management - Admin Portal</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Master Data Management</h1>
		<p class="text-gray-600">Manage global categories like vehicle types, payload types, and facilities</p>
	</div>

	<!-- Category Tabs -->
	<div class="bg-white rounded-lg shadow-sm mb-6">
		<div class="border-b border-gray-200">
			<nav class="flex space-x-8 px-6" aria-label="Categories">
				{#each categories as category}
					<button
						on:click={() => switchCategory(category.key)}
						class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors {
							activeCategory === category.key
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
						}"
					>
						<span class="mr-2">{category.icon}</span>
						{category.label}
					</button>
				{/each}
			</nav>
		</div>
	</div>

	<!-- Main Content -->
	<div class="bg-white rounded-lg shadow-sm">
		<div class="px-6 py-4 border-b border-gray-200">
			<div class="flex justify-between items-center">
				<h2 class="text-lg font-medium text-gray-900">
					{categories.find(c => c.key === activeCategory)?.label || 'Items'}
				</h2>
				<button
					on:click={openCreateModal}
					class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
				>
					+ Add New
				</button>
			</div>
		</div>

		<div class="p-6">
			{#if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
					<p class="text-red-800">{error}</p>
				</div>
			{/if}

			{#if loading}
				<div class="flex justify-center items-center py-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			{:else if items.length === 0}
				<div class="text-center py-12 text-gray-500">
					<p class="text-lg mb-2">No items found</p>
					<p class="text-sm">Click "Add New" to create the first item.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each items as item}
						<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center">
									{#if item.icon}
										<span class="text-2xl mr-3">{item.icon}</span>
									{/if}
									<span class="font-medium text-gray-900">{item.name}</span>
								</div>
								<div class="flex space-x-2">
									<button
										on:click={() => openEditModal(item)}
										class="text-blue-600 hover:text-blue-800 text-sm"
									>
										Edit
									</button>
									<button
										on:click={() => handleDelete(item)}
										class="text-red-600 hover:text-red-800 text-sm"
									>
										Delete
									</button>
								</div>
							</div>
							<div class="text-xs text-gray-500">ID: {item.id}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<h3 class="text-lg font-medium text-gray-900 mb-4">
					{editingItem ? 'Edit' : 'Create'} {categories.find(c => c.key === activeCategory)?.label.slice(0, -1) || 'Item'}
				</h3>
				
				<form on:submit|preventDefault={handleSubmit} class="space-y-4">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
							Name
						</label>
						<input
							id="name"
							type="text"
							bind:value={formData.name}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Enter name"
							required
						/>
					</div>
					
					<div>
						<label for="icon" class="block text-sm font-medium text-gray-700 mb-1">
							Icon (optional)
						</label>
						<input
							id="icon"
							type="text"
							bind:value={formData.icon}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="🚗 (emoji or text)"
						/>
					</div>
					
					<div class="flex gap-3 pt-4">
						<button
							type="submit"
							class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
						>
							{editingItem ? 'Update' : 'Create'}
						</button>
						<button
							type="button"
							on:click={closeModal}
							class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}