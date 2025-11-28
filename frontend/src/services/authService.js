// src/services/authService.js

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const loginAPI = async (email, password) => {
  try {
    const res = await fetch(`${API_URL}/Auth/login`, {
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
    const data = await res.json();

    return data;

  } catch (error) {
    console.error("Lỗi fetch:", error);
    return { 
      success: false, 
      message: "Không thể kết nối đến máy chủ." 
    };
  }
};