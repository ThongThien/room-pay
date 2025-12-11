const AA_API_URL = process.env.NEXT_PUBLIC_AA_API_URL;

interface ApiResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    role: string;
    fullName: string;
  };
  [key: string]: unknown;
}

export const loginAPI = async (email: string, password: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${AA_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    // Lấy dữ liệu JSON trả về từ Backend
    const data: ApiResponse = await res.json();

    return data;

  } catch (error) {
    console.error("Lỗi fetch:", error);
    return {
      success: false,
      message: "Không thể kết nối đến máy chủ."
    };
  }
};

export const registerAPI = async (fullName: string, email: string, password: string, confirmPassword: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${AA_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: fullName,
        email: email,
        password: password,
        confirmPassword: confirmPassword
      }),
    });

    const data: ApiResponse = await res.json();
    return data;

  } catch (error) {
    console.error("Lỗi fetch register:", error);
    return {
      success: false,
      message: "Không thể kết nối đến máy chủ."
    };
  }
};