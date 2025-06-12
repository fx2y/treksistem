export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.startsWith("0")) {
    return "62" + cleanPhone.slice(1);
  }

  if (cleanPhone.startsWith("62")) {
    return cleanPhone;
  }

  if (cleanPhone.startsWith("8")) {
    return "62" + cleanPhone;
  }

  return cleanPhone;
}

export function formatMessage(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return data[key] || match;
  });
}
