<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/services/apiClient';
	import type { Invoice } from '$lib/types';
	import { Clock, CheckCircle, AlertTriangle, QrCode, Calendar } from 'lucide-svelte';

	let invoices: Invoice[] = [];
	let loading = true;
	let error = '';
	let statusFilter = 'all';
	let showQRModal = false;
	let selectedInvoice: Invoice | null = null;
	let qrCodeDataURL = '';

	onMount(async () => {
		await loadInvoices();
	});

	async function loadInvoices() {
		try {
			loading = true;

			const params = new URLSearchParams();
			if (statusFilter !== 'all') params.append('status', statusFilter);

			const response = await apiClient.get<{ invoices: Invoice[] }>(
				'/mitra/billing/invoices',
				params
			);
			invoices = response.invoices;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load invoices';
		} finally {
			loading = false;
		}
	}

	async function handleStatusFilterChange() {
		await loadInvoices();
	}

	async function showQRCode(invoice: Invoice) {
		selectedInvoice = invoice;
		showQRModal = true;
		qrCodeDataURL = await generateQRCodeDataURL(invoice.qrisPayload);
	}

	function closeQRModal() {
		showQRModal = false;
		selectedInvoice = null;
		qrCodeDataURL = '';
	}

	function getStatusColor(status: Invoice['status']) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'paid':
				return 'bg-green-100 text-green-800';
			case 'overdue':
				return 'bg-red-100 text-red-800';
			case 'cancelled':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getStatusIcon(status: Invoice['status']) {
		switch (status) {
			case 'pending':
				return Clock;
			case 'paid':
				return CheckCircle;
			case 'overdue':
				return AlertTriangle;
			case 'cancelled':
				return AlertTriangle;
			default:
				return Clock;
		}
	}

	function getTypeLabel(type: Invoice['type']) {
		switch (type) {
			case 'PLATFORM_SUBSCRIPTION':
				return 'Platform Subscription';
			case 'CUSTOMER_PAYMENT':
				return 'Customer Payment';
			default:
				return type;
		}
	}

	function formatCurrency(amount: number, currency: string) {
		if (currency === 'IDR') {
			return `Rp ${amount.toLocaleString('id-ID')}`;
		}
		return `${currency} ${amount}`;
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatDateTime(dateString: string) {
		return new Date(dateString).toLocaleString('id-ID', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Generate QR code data URL
	async function generateQRCodeDataURL(qrisPayload: string): Promise<string> {
		const QRCode = await import('qrcode');
		return QRCode.toDataURL(qrisPayload, {
			width: 200,
			margin: 2,
			color: {
				dark: '#000000',
				light: '#FFFFFF'
			}
		});
	}

	$: filteredInvoices = invoices;
</script>

<div class="space-y-6">
	<div class="sm:flex sm:items-center">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-bold text-gray-900">Billing</h1>
			<p class="mt-1 text-sm text-gray-500">Manage your invoices and payments</p>
		</div>
	</div>

	<!-- Status Filter -->
	<div class="bg-white shadow sm:rounded-lg">
		<div class="px-4 py-5 sm:p-6">
			<div class="sm:flex sm:items-center">
				<div class="sm:flex-auto">
					<h3 class="text-lg leading-6 font-medium text-gray-900">Filter by Status</h3>
				</div>
				<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
					<select
						bind:value={statusFilter}
						on:change={handleStatusFilterChange}
						class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					>
						<option value="all">All Invoices</option>
						<option value="pending">Pending</option>
						<option value="paid">Paid</option>
						<option value="overdue">Overdue</option>
						<option value="cancelled">Cancelled</option>
					</select>
				</div>
			</div>
		</div>
	</div>

	<!-- Invoices List -->
	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-sm text-gray-500">Loading invoices...</p>
		</div>
	{:else if error}
		<div class="text-center py-12">
			<div class="text-red-600 text-sm">{error}</div>
			<button
				type="button"
				on:click={loadInvoices}
				class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
			>
				Retry
			</button>
		</div>
	{:else if filteredInvoices.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-500">
				<p class="text-lg font-medium">No invoices found</p>
				<p class="mt-1 text-sm">
					{statusFilter === 'all'
						? 'Invoices will appear here when generated'
						: `No ${statusFilter} invoices found`}
				</p>
			</div>
		</div>
	{:else}
		<div class="bg-white shadow overflow-hidden sm:rounded-md">
			<ul class="divide-y divide-gray-200">
				{#each filteredInvoices as invoice}
					<li class="px-6 py-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<svelte:component
										this={getStatusIcon(invoice.status)}
										class="h-5 w-5 text-gray-400"
									/>
								</div>
								<div class="ml-4">
									<div class="flex items-center">
										<h3 class="text-lg font-medium text-gray-900">
											Invoice #{invoice.publicId}
										</h3>
									</div>
									<div class="mt-1 text-sm text-gray-500">
										{getTypeLabel(invoice.type)}
									</div>
									<div class="mt-1 text-sm text-gray-500 flex items-center">
										<Calendar class="h-3 w-3 mr-1" />
										Due: {formatDate(invoice.dueDate)}
									</div>
									{#if invoice.paidAt}
										<div class="mt-1 text-sm text-green-600">
											Paid: {formatDateTime(invoice.paidAt)}
										</div>
									{/if}
								</div>
							</div>
							<div class="flex items-center space-x-4">
								<div class="text-right">
									<div class="text-lg font-medium text-gray-900">
										{formatCurrency(invoice.amount, invoice.currency)}
									</div>
									<span
										class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(
											invoice.status
										)}"
									>
										{invoice.status}
									</span>
								</div>
								{#if invoice.status === 'pending' && invoice.qrisPayload}
									<button
										type="button"
										on:click={() => showQRCode(invoice)}
										class="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
										title="Show QR Code for Payment"
									>
										<QrCode class="h-4 w-4 mr-2" />
										Pay Now
									</button>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<!-- QR Code Modal -->
{#if showQRModal && selectedInvoice}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div
			class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
				on:click={closeQRModal}
				on:keydown={closeQRModal}
				role="button"
				tabindex="0"
				aria-label="Close QR modal"
			></div>

			<div
				class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
			>
				<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<div class="sm:flex sm:items-start">
						<div class="w-full mt-3 text-center sm:mt-0 sm:text-left">
							<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Payment QR Code</h3>
							<div class="text-center">
								<div class="mb-4">
									<p class="text-sm text-gray-600">Invoice #{selectedInvoice.publicId}</p>
									<p class="text-lg font-semibold text-gray-900">
										{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
									</p>
								</div>

								<!-- QR Code Display -->
								<div class="flex justify-center mb-4">
									{#if qrCodeDataURL}
										<img
											src={qrCodeDataURL}
											alt="QRIS Payment QR Code"
											class="border border-gray-200 rounded-lg"
										/>
									{:else}
										<div
											class="w-[200px] h-[200px] border border-gray-200 rounded-lg flex items-center justify-center"
										>
											<div
												class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
											></div>
										</div>
									{/if}
								</div>

								<div class="text-sm text-gray-600 space-y-2">
									<p>Scan this QR code with any Indonesian payment app:</p>
									<p class="font-medium">Dana • GoPay • OVO • LinkAja • ShopeePay</p>
									<p class="text-xs text-gray-500 mt-2">
										Payment will be confirmed manually by admin
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
					<button
						type="button"
						on:click={closeQRModal}
						class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
