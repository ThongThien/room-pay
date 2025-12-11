export const API_URLS = {
  AA: process.env.NEXT_PUBLIC_AA_API_URL,
  INVOICE: process.env.NEXT_PUBLIC_INVOICE_API_URL,
  PROPERTY: process.env.NEXT_PUBLIC_PROPERTY_API_URL,
  READING: process.env.NEXT_PUBLIC_READING_API_URL,
  IMAGE: process.env.NEXT_PUBLIC_IMAGE_SCAN_API_URL,
};

export const getAuthHeaders = (): Record<string, string> => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return {
    "Content-Type": "application/json",
  };
};