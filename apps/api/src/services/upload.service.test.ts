import { describe, it, expect, beforeEach, vi } from "vitest";
import { UploadService, UploadEnvironment, UserProfile } from "./upload.service";
import { ForbiddenError } from "../lib/errors";

// Mock the storage package
vi.mock("@treksistem/storage", () => ({
  createR2UploadService: vi.fn(() => ({
    generateUploadUrl: vi.fn(),
  })),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-nanoid-123"),
}));

describe("UploadService", () => {
  let uploadService: UploadService;
  let mockDb: any;
  let mockEnv: UploadEnvironment;
  let mockR2Service: any;

  beforeEach(async () => {
    mockDb = {};

    mockEnv = {
      R2_BUCKET: {} as R2Bucket,
      R2_ACCOUNT_ID: "test-account-id",
      R2_ACCESS_KEY_ID: "test-access-key",
      R2_SECRET_ACCESS_KEY: "test-secret-key",
      R2_PUBLIC_URL: "https://test-bucket.r2.dev",
      UPLOAD_URL_EXPIRES_IN_SECONDS: "300",
    };

    mockR2Service = {
      generateUploadUrl: vi.fn(),
    };

    const { createR2UploadService } = await import("@treksistem/storage");
    vi.mocked(createR2UploadService).mockReturnValue(mockR2Service);

    uploadService = new UploadService(mockDb, mockEnv);
  });

  describe("generateDriverUploadUrl", () => {
    const validRequest = {
      fileName: "test-image.jpg",
      contentType: "image/jpeg",
      orderId: "order_123",
    };

    const validDriverProfile: UserProfile = {
      roles: {
        isDriver: true,
        driverForMitras: [{ mitraId: "mitra_123" }],
      },
    };

    it("should generate upload URL for valid driver", async () => {
      const expectedResponse = {
        signedUrl: "https://signed-url.example.com",
        publicUrl: "https://test-bucket.r2.dev/reports/mitra_123/order_123/mock-nanoid-123-test-image.jpg",
      };

      mockR2Service.generateUploadUrl.mockResolvedValue(expectedResponse);

      const result = await uploadService.generateDriverUploadUrl(
        validRequest,
        validDriverProfile
      );

      expect(result).toEqual(expectedResponse);
      expect(mockR2Service.generateUploadUrl).toHaveBeenCalledWith({
        key: "reports/mitra_123/order_123/mock-nanoid-123-test-image.jpg",
        contentType: "image/jpeg",
        expiresInSeconds: 300,
      });
    });

    it("should throw ForbiddenError when user is not a driver", async () => {
      const nonDriverProfile: UserProfile = {
        roles: {
          isDriver: false,
        },
      };

      await expect(
        uploadService.generateDriverUploadUrl(validRequest, nonDriverProfile)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        uploadService.generateDriverUploadUrl(validRequest, nonDriverProfile)
      ).rejects.toThrow("Driver is not associated with a Mitra.");
    });

    it("should throw ForbiddenError when driver has no mitras", async () => {
      const driverWithoutMitras: UserProfile = {
        roles: {
          isDriver: true,
          driverForMitras: [],
        },
      };

      await expect(
        uploadService.generateDriverUploadUrl(validRequest, driverWithoutMitras)
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError when driverForMitras is undefined", async () => {
      const driverWithUndefinedMitras: UserProfile = {
        roles: {
          isDriver: true,
        },
      };

      await expect(
        uploadService.generateDriverUploadUrl(validRequest, driverWithUndefinedMitras)
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw error when R2 configuration is incomplete - missing bucket", async () => {
      const incompleteEnv = { ...mockEnv, R2_BUCKET: undefined };
      const serviceWithIncompleteEnv = new UploadService(mockDb, incompleteEnv);

      await expect(
        serviceWithIncompleteEnv.generateDriverUploadUrl(validRequest, validDriverProfile)
      ).rejects.toThrow("R2 configuration is incomplete");
    });

    it("should throw error when R2 configuration is incomplete - missing account ID", async () => {
      const incompleteEnv = { ...mockEnv, R2_ACCOUNT_ID: undefined };
      const serviceWithIncompleteEnv = new UploadService(mockDb, incompleteEnv);

      await expect(
        serviceWithIncompleteEnv.generateDriverUploadUrl(validRequest, validDriverProfile)
      ).rejects.toThrow("R2 configuration is incomplete");
    });

    it("should use default expiration time when not configured", async () => {
      const envWithoutExpiry = { ...mockEnv, UPLOAD_URL_EXPIRES_IN_SECONDS: undefined };
      const serviceWithoutExpiry = new UploadService(mockDb, envWithoutExpiry);

      mockR2Service.generateUploadUrl.mockResolvedValue({
        signedUrl: "https://signed-url.example.com",
        publicUrl: "https://public-url.example.com",
      });

      await serviceWithoutExpiry.generateDriverUploadUrl(validRequest, validDriverProfile);

      expect(mockR2Service.generateUploadUrl).toHaveBeenCalledWith({
        key: "reports/mitra_123/order_123/mock-nanoid-123-test-image.jpg",
        contentType: "image/jpeg",
        expiresInSeconds: 300, // default value
      });
    });

    it("should use custom expiration time when configured", async () => {
      const envWithCustomExpiry = { ...mockEnv, UPLOAD_URL_EXPIRES_IN_SECONDS: "600" };
      const serviceWithCustomExpiry = new UploadService(mockDb, envWithCustomExpiry);

      mockR2Service.generateUploadUrl.mockResolvedValue({
        signedUrl: "https://signed-url.example.com",
        publicUrl: "https://public-url.example.com",
      });

      await serviceWithCustomExpiry.generateDriverUploadUrl(validRequest, validDriverProfile);

      expect(mockR2Service.generateUploadUrl).toHaveBeenCalledWith({
        key: "reports/mitra_123/order_123/mock-nanoid-123-test-image.jpg",
        contentType: "image/jpeg",
        expiresInSeconds: 600, // custom value
      });
    });

    it("should generate key with correct path structure", async () => {
      mockR2Service.generateUploadUrl.mockResolvedValue({
        signedUrl: "https://signed-url.example.com",
        publicUrl: "https://public-url.example.com",
      });

      await uploadService.generateDriverUploadUrl(validRequest, validDriverProfile);

      expect(mockR2Service.generateUploadUrl).toHaveBeenCalledWith({
        key: "reports/mitra_123/order_123/mock-nanoid-123-test-image.jpg",
        contentType: "image/jpeg",
        expiresInSeconds: 300,
      });
    });
  });
});