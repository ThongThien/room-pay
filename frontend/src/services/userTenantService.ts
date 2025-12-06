import { API_URLS, getAuthHeaders } from "@/utils/config";

export const createUserAPI = async (fullName: string, email: string) => {
  try {
    const res = await fetch(`${API_URLS.AA}/users`, {
      method: 'POST',
      headers: getAuthHeaders(), // Tự động lấy token và Content-Type từ config
      body: JSON.stringify({
        fullName: fullName,
        email: email
      }),
    });

    const data = await res.json();
    return data;

  } catch (error) {
    console.error("Lỗi tạo user:", error);
    return {
      success: false,
      message: "Không thể kết nối đến máy chủ."
    };
  }
};