export interface AuthUser {
	userId: string;
	email: string;
	name: string;
	avatarUrl: string;
	roles: {
		isMitra: boolean;
		isDriver: boolean;
		isAdmin: boolean;
	};
	mitraId?: string;
	driverId?: string;
}
