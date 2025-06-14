import type { AuthUser } from './lib/types/auth';

declare global {
	namespace App {
		interface Error {
			message?: string;
		}
		interface Locals {
			user?: AuthUser;
		}
		interface PageData {
			[key: string]: unknown;
		}
		interface PageState {
			[key: string]: unknown;
		}
		interface Platform {
			[key: string]: unknown;
		}
	}
}

export {};
