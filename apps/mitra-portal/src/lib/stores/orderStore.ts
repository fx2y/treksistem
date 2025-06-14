import { api } from '@treksistem/api-client';
import { writable } from 'svelte/store';

interface Order {
	id: string;
	publicId: string;
	ordererName: string;
	ordererPhone: string;
	recipientName: string;
	recipientPhone: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface OrderState {
	orders: Order[];
	loading: boolean;
	error: string | null;
	filters: {
		status?: string;
		page: number;
		limit: number;
	};
}

const initialState: OrderState = {
	orders: [],
	loading: false,
	error: null,
	filters: {
		page: 1,
		limit: 20
	}
};

export const orderStore = writable<OrderState>(initialState);

export const orderActions = {
	async fetchOrders(): Promise<void> {
		orderStore.update((state) => ({ ...state, loading: true, error: null }));

		try {
			const response = await api.mitra.orders.get({
				query: {
					page: initialState.filters.page.toString(),
					limit: initialState.filters.limit.toString(),
					...(initialState.filters.status && { status: initialState.filters.status })
				}
			});

			orderStore.update((state) => ({
				...state,
				orders: response.data || [],
				loading: false
			}));
		} catch (error) {
			orderStore.update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to fetch orders',
				loading: false
			}));
		}
	},

	setFilter(key: keyof OrderState['filters'], value: string | number): void {
		orderStore.update((state) => ({
			...state,
			filters: {
				...state.filters,
				[key]: value
			}
		}));
	},

	async refresh(): Promise<void> {
		await orderActions.fetchOrders();
	}
};
