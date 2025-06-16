import { BaseApiClient } from "@treksistem/api-client";

import { PUBLIC_API_URL } from "$lib/env";

interface MasterDataItem {
  id: string;
  name: string;
  icon?: string;
}

interface Invoice {
  publicId: string;
  status: string;
  amount: number;
  mitraName: string;
  createdAt: string;
}

interface PaymentConfirmation {
  paymentDate: string;
  notes?: string;
}

class AdminApiClient extends BaseApiClient {
  constructor() {
    super(PUBLIC_API_URL);
  }

  async getMasterData(category: string): Promise<{ data: MasterDataItem[] }> {
    return this.get<{ data: MasterDataItem[] }>(
      `/api/admin/master-data/${category}`
    );
  }

  async createMasterDataItem(
    category: string,
    item: { name: string; icon?: string }
  ): Promise<MasterDataItem> {
    return this.post<MasterDataItem>(
      `/api/admin/master-data/${category}`,
      item
    );
  }

  async updateMasterDataItem(
    category: string,
    itemId: string,
    item: { name: string; icon?: string }
  ): Promise<MasterDataItem> {
    return this.put<MasterDataItem>(
      `/api/admin/master-data/${category}/${itemId}`,
      item
    );
  }

  async deleteMasterDataItem(category: string, itemId: string): Promise<void> {
    await this.delete(`/api/admin/master-data/${category}/${itemId}`);
  }

  async getPendingInvoices(): Promise<{ data: Invoice[] }> {
    // This would need to be implemented in the backend if not already
    return this.get<{ data: Invoice[] }>("/api/admin/invoices?status=pending");
  }

  async confirmPayment(
    invoiceId: string,
    confirmation: PaymentConfirmation
  ): Promise<any> {
    return this.post(
      `/api/admin/invoices/${invoiceId}/confirm-payment`,
      confirmation
    );
  }

  async getMitras(): Promise<any> {
    return this.get("/api/admin/mitras");
  }
}

export const adminApiClient = new AdminApiClient();
