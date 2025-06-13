import type { AuthUser } from './lib/types/auth';

declare global {
	namespace App {
		interface Error {}
		interface Locals {
			user?: AuthUser;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
}

export {};
