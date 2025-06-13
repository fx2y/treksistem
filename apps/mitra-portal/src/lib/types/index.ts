export interface MasterData {
	vehicles: { id: string; name: string; icon: string }[];
	payloads: { id: string; name: string; icon: string }[];
	facilities: { id: string; name: string; icon: string }[];
}

export interface Service {
	id: string;
	name: string;
	isPublic: boolean;
	maxRangeKm: number;
	rate: {
		baseFee: number;
		feePerKm: number;
	};
	supportedVehicleTypeIds: string[];
	supportedPayloadTypeIds: string[];
	availableFacilityIds: string[];
}

export interface Driver {
	id: string;
	userId: string;
	name: string;
	email: string;
	status: 'active' | 'inactive' | 'on_duty';
}

export interface Vehicle {
	id: string;
	licensePlate: string;
	description: string;
}

export interface OrderStop {
	id: string;
	sequence: number;
	type: 'pickup' | 'dropoff';
	address: string;
	status: 'pending' | 'completed';
}

export interface Order {
	id: string;
	public_id: string;
	status:
		| 'pending_dispatch'
		| 'accepted'
		| 'pickup'
		| 'in_transit'
		| 'delivered'
		| 'cancelled'
		| 'claimed';
	ordererName: string;
	recipientName: string;
	estimatedCost: number;
	createdAt: string; // ISO8601Timestamp
	driverName?: string;
	stops: OrderStop[];
}

export interface LogbookEntry {
	orderId: string;
	timestamp: string; // ISO8601Timestamp
	driverName: string;
	vehicleLicensePlate: string;
	event: string;
	address: string;
}

export interface Invoice {
	id: string;
	publicId: string;
	type: 'PLATFORM_SUBSCRIPTION' | 'CUSTOMER_PAYMENT';
	status: 'pending' | 'paid' | 'overdue' | 'cancelled';
	amount: number;
	currency: string;
	qrisPayload: string;
	dueDate: string; // ISO8601Timestamp
	paidAt?: string; // ISO8601Timestamp
}

export * from './auth';
