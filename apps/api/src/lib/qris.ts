interface QRISOptions {
  amount: number;
  invoiceId: string;
  description: string;
  merchantName?: string;
  merchantCity?: string;
}

export function generateQRIS(options: QRISOptions): string {
  const {
    amount,
    invoiceId,
    description,
    merchantName = "Treksistem",
    merchantCity = "Jakarta",
  } = options;

  // Input validation
  if (!amount || amount <= 0) {
    throw new Error("QRIS: Amount must be positive");
  }
  if (!invoiceId || invoiceId.trim().length === 0) {
    throw new Error("QRIS: Invoice ID is required");
  }
  if (!description || description.trim().length === 0) {
    throw new Error("QRIS: Description is required");
  }
  if (amount > 999999999) {
    throw new Error("QRIS: Amount exceeds maximum limit");
  }

  // EMVCo QRIS format implementation
  // Enhanced implementation with proper validation and error handling
  // TODO: Replace with certified QRIS library for production use

  const payload = [
    "00020101021226", // Payload Format Indicator
    `26${getFormattedLength("ID.CO.QRIS.WWW")}ID.CO.QRIS.WWW`, // Merchant Account Information
    "52044899", // Merchant Category Code (4899 = Other Services)
    "5303360", // Transaction Currency (360 = IDR)
    `54${getFormattedLength(amount.toString())}${amount}`, // Transaction Amount
    "5802ID", // Country Code
    `59${getFormattedLength(merchantName)}${merchantName}`, // Merchant Name
    `60${getFormattedLength(merchantCity)}${merchantCity}`, // Merchant City
    `62${getFormattedLength(`05${getFormattedLength(invoiceId)}${invoiceId}07${getFormattedLength(description)}${description}`)}05${getFormattedLength(invoiceId)}${invoiceId}07${getFormattedLength(description)}${description}`, // Additional Data
  ].join("");

  // Add CRC16 checksum
  const crc = calculateCRC16(payload + "6304");
  return payload + "6304" + crc.toString(16).toUpperCase().padStart(4, "0");
}

function getFormattedLength(value: string): string {
  const length = value.length;
  if (length > 99) {
    throw new Error("QRIS: Field length exceeds maximum (99)");
  }
  return length.toString().padStart(2, "0");
}

function calculateCRC16(data: string): number {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc;
}
