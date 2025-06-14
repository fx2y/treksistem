import type { MitraProfile, UpdateMitraProfile } from '../types';

import { apiClient } from './apiClient';

export class MitraProfileClientService {
	static async getProfile(): Promise<MitraProfile> {
		return apiClient.get<MitraProfile>('/mitra/profile');
	}

	static async updateProfile(data: UpdateMitraProfile): Promise<MitraProfile> {
		return apiClient.put<MitraProfile>('/mitra/profile', data);
	}
}
