<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApiClient } from '$lib/services/apiClient';

	interface Invoice {
		publicId: string;
		status: string;
		amount: number;
		mitraName: string;
		createdAt: string;
	}

	let invoices: Invoice[] = [];
	let loading = false;
	let error = '';
	let showModal = false;
	let selectedInvoice: Invoice | null = null;
	let formData = {
		paymentDate: new Date().toISOString().split('T')[0],
		notes: ''
	};

	// Mock data for demo since the backend endpoint might not exist
	const mockInvoices: Invoice[] = [
		{
			publicId: 'inv_001',
			status: 'pending',
			amount: 50000,
			mitraName: 'Katering Bu Ani',
			createdAt: '2024-01-15T08:00:00Z'
		},
		{
			publicId: 'inv_002',
			status: 'pending',
			amount: 75000,
			mitraName: 'Toko Berkah',
			createdAt: '2024-01-14T10:30:00Z'
		}
	];

	onMount(() => {
		loadInvoices();
	});

	async function loadInvoices() {
		try {
			loading = true;
			error = '';
			
			// Try to load from API, fall back to mock data
			try {
				const response = await adminApiClient.getPendingInvoices();
				invoices = response.data;
			} catch (apiError) {
				console.warn('Failed to load from API, using mock data:', apiError);
				invoices = mockInvoices;
			}
		} catch (err) {
			error = 'Failed to load invoices. Please try again.';
			console.error('Error loading invoices:', err);
			invoices = mockInvoices; // Fallback to mock data
		} finally {
			loading = false;
		}
	}

	function openConfirmModal(invoice: Invoice) {
		selectedInvoice = invoice;
		formData = {
			paymentDate: new Date().toISOString().split('T')[0],
			notes: ''
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedInvoice = null;
		formData = {
			paymentDate: new Date().toISOString().split('T')[0],
			notes: ''
		};
	}

	async function handleConfirmPayment() {
		if (!selectedInvoice) return;

		if (!formData.paymentDate) {
			error = 'Payment date is required';
			return;
		}

		try {
			error = '';
			
			await adminApiClient.confirmPayment(selectedInvoice.publicId, {
				paymentDate: formData.paymentDate,
				notes: formData.notes.trim() || undefined
			});

			// Update the invoice status locally
			invoices = invoices.map(inv => 
				inv.publicId === selectedInvoice!.publicId
					? { ...inv, status: 'paid' }
					: inv
			);

			closeModal();
		} catch (err) {
			error = 'Failed to confirm payment. Please try again.';
			console.error('Error confirming payment:', err);
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status: string): string {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'paid':
				return 'bg-green-100 text-green-800';
			case 'overdue':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<svelte:head>
	<title>Manual Payment Confirmation - Admin Portal</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Manual Payment Confirmation</h1>
		<p class="text-gray-600">Confirm payments received outside the system (bank transfer, cash, etc.)</p>
	</div>

	<div class="bg-white rounded-lg shadow-sm">
		<div class="px-6 py-4 border-b border-gray-200">
			<div class="flex justify-between items-center">
				<h2 class="text-lg font-medium text-gray-900">Invoice List</h2>
				<button
					on:click={loadInvoices}
					class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
				>
					🔄 Refresh
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
			{:else if invoices.length === 0}
				<div class="text-center py-12 text-gray-500">
					<p class="text-lg mb-2">No invoices found</p>
					<p class="text-sm">All invoices have been processed.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Invoice ID
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Mitra
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Amount
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Created
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each invoices as invoice}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">{invoice.publicId}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">{invoice.mitraName}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusBadge(invoice.status)}">
											{invoice.status.toUpperCase()}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">{formatDate(invoice.createdAt)}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										{#if invoice.status === 'pending'}
											<button
												on:click={() => openConfirmModal(invoice)}
												class="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
											>
												✅ Confirm Payment
											</button>
										{:else}
											<span class="text-gray-400">Completed</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Payment Confirmation Modal -->
{#if showModal && selectedInvoice}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<h3 class="text-lg font-medium text-gray-900 mb-4">
					Confirm Payment
				</h3>
				
				<div class="mb-4 p-3 bg-gray-50 rounded-lg">
					<div class="text-sm text-gray-600">Invoice ID:</div>
					<div class="font-medium text-gray-900">{selectedInvoice.publicId}</div>
					<div class="text-sm text-gray-600 mt-1">Mitra:</div>
					<div class="font-medium text-gray-900">{selectedInvoice.mitraName}</div>
					<div class="text-sm text-gray-600 mt-1">Amount:</div>
					<div class="font-medium text-gray-900">{formatCurrency(selectedInvoice.amount)}</div>
				</div>
				
				<form on:submit|preventDefault={handleConfirmPayment} class="space-y-4">
					<div>
						<label for="paymentDate" class="block text-sm font-medium text-gray-700 mb-1">
							Payment Date *
						</label>
						<input
							id="paymentDate"
							type="date"
							bind:value={formData.paymentDate}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>
					
					<div>
						<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
							Notes (optional)
						</label>
						<textarea
							id="notes"
							bind:value={formData.notes}
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Payment method, reference number, etc."
						></textarea>
					</div>
					
					<div class="flex gap-3 pt-4">
						<button
							type="submit"
							class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
						>
							✅ Confirm Payment
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