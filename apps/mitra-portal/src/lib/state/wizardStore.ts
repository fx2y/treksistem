import { writable } from 'svelte/store';

export interface WizardState {
	isOpen: boolean;
	currentStep: number; // 1-based index
	totalSteps: number;
	profileData: {
		businessName: string;
		address: string;
		phone: string;
	};
	serviceData: {
		name: string;
		baseFee: number;
		feePerKm: number;
	};
	driverData: {
		email: string;
		inviteSkipped: boolean;
	};
}

const initialState: WizardState = {
	isOpen: false,
	currentStep: 1,
	totalSteps: 3,
	profileData: {
		businessName: '',
		address: '',
		phone: ''
	},
	serviceData: {
		name: '',
		baseFee: 0,
		feePerKm: 0
	},
	driverData: {
		email: '',
		inviteSkipped: false
	}
};

export const wizardStore = writable<WizardState>(initialState);

// Helper functions
export const wizardActions = {
	open: () => {
		wizardStore.update((state) => ({ ...state, isOpen: true }));
	},
	close: () => {
		wizardStore.update((state) => ({ ...state, isOpen: false }));
	},
	nextStep: () => {
		wizardStore.update((state) => ({
			...state,
			currentStep: Math.min(state.currentStep + 1, state.totalSteps)
		}));
	},
	prevStep: () => {
		wizardStore.update((state) => ({
			...state,
			currentStep: Math.max(state.currentStep - 1, 1)
		}));
	},
	updateProfileData: (data: Partial<WizardState['profileData']>) => {
		wizardStore.update((state) => ({
			...state,
			profileData: { ...state.profileData, ...data }
		}));
	},
	updateServiceData: (data: Partial<WizardState['serviceData']>) => {
		wizardStore.update((state) => ({
			...state,
			serviceData: { ...state.serviceData, ...data }
		}));
	},
	updateDriverData: (data: Partial<WizardState['driverData']>) => {
		wizardStore.update((state) => ({
			...state,
			driverData: { ...state.driverData, ...data }
		}));
	},
	reset: () => {
		wizardStore.set(initialState);
	}
};
