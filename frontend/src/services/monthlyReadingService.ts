import { API_URLS, getAuthHeaders } from "@/utils/config";
import { MonthlyReading } from "@/types/monthlyReading";

const BASE_URL = `${API_URLS.READING}/MonthlyReading`;
const CYCLE_URL = `${API_URLS.READING}/ReadingCycle`;

/**
 * Lấy tất cả chỉ số điện nước (Dành cho cả Owner và Tenant)
 * Endpoint: GET /api/MonthlyReading
 */
export const getAllMonthlyReadings = async (): Promise<MonthlyReading[]> => {
  try {
    const response = await fetch(`${API_URLS.READING}/MonthlyReading`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Vui lòng đăng nhập lại.");
      }
      throw new Error(`Failed to fetch readings: ${response.statusText}`);
    }

    const data: MonthlyReading[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching monthly readings:", error);
    return []; // Trả về mảng rỗng để không crash UI
  }
};

/**
 * Lấy chi tiết một bản ghi chỉ số theo ID
 * Endpoint: GET /api/MonthlyReading/{id}
 */
export const getMonthlyReadingById = async (id: number): Promise<MonthlyReading | null> => {
  try {
    const response = await fetch(`${API_URLS.READING}/MonthlyReading/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error(`Error fetching reading #${id}:`, error);
    return null;
  }
};

/**
 * (Dành cho Tenant) Nộp chỉ số điện nước
 * Endpoint: POST /api/MonthlyReading/{cycleId}/submit
 */
export const submitMonthlyReading = async (
  cycleId: number, 
  formData: FormData
): Promise<boolean> => {
  try {
    const headers = getAuthHeaders();
    
    // QUAN TRỌNG: Xóa 'Content-Type' để browser tự động set 'multipart/form-data' kèm boundary
    // Nếu để 'application/json', việc upload ảnh sẽ thất bại.
    delete headers["Content-Type"];

    const response = await fetch(`${API_URLS.READING}/MonthlyReading/${cycleId}/submit`, {
      method: "POST",
      headers: headers, // Header đã xóa Content-Type nhưng vẫn còn Authorization
      body: formData,
    });

    return response.ok;
  } catch (error) {
    console.error("Error submitting reading:", error);
    return false;
  }
};

// Nhắc nộp chỉ số (Gửi cho những người status = Pending/Overdue)
export const sendRemindSubmission = async (): Promise<boolean> => {
  try {
    // API: POST /api/MonthlyReading/remind-submission/latest
    const response = await fetch(`${BASE_URL}/remind-submission/latest`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error(`Failed to remind submission. Status: ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error calling remind submission API:", error);
    return false;
  }
};

// Thông báo kỳ mới
export const triggerNewCycleNotification = async (month: number, year: number): Promise<boolean> => {
  try {
    // API: POST /api/ReadingCycle (Body: { cycleMonth, cycleYear })
    // Lưu ý: API này vừa tạo chu kỳ (nếu chưa có) vừa gửi thông báo
    const response = await fetch(`${CYCLE_URL}`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cycleMonth: month, cycleYear: year }),
    });

    if (!response.ok) {
        // Có thể API trả về lỗi nếu chu kỳ đã tồn tại
        console.error(`Failed to trigger new cycle. Status: ${response.status}`);
        return false;
    }
    return true;
  } catch (error) {
    console.error("Error triggering new cycle:", error);
    return false;
  }
};