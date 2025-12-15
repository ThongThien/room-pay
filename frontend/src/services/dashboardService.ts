import { getAuthHeaders, API_URLS } from '@/utils/config';
import { ticketService } from '@/services/ticketService';
import { 
    OwnerDashboardData, 
    MonthlyRevenueDataPoint,
    PendingInvoiceListItem,
    AbnormalReadingListItem,
    OverdueInvoiceListItem,
    NearExpiryContractListItem,
    BuildingPerformance
} from '@/types/dashboard';
import { 
    formatCurrency, 
    formatCurrencyInMillions, 
    calculateRemainingDays 
} from '@/utils/dashboard';

// --- INTERFACES RAW ---
interface RawHouse { name: string; id: number; }
interface RawPendingInvoice { id: number; tenantName: string; roomName: string; amount: number; invoiceDate: string; }
interface RawAbnormalReading { id: number; tenantName?: string; roomName?: string; houseName?: string; electricOld: number; electricNew: number; waterOld: number; waterNew: number; type?: 'Electricity' | 'Water'; }
interface RawContract { id: number; tenantName?: string; houseName: string; roomNumber: string; endDate: string; }
interface RawOverdueInvoice { id: number; userName?: string; houseName?: string; roomName?: string; totalAmount: number; dueDate: string; }

interface RawPaidInvoice {
    id: number;
    houseName: string; 
    totalAmount: number;
    paidDate?: string; 
}

// Helper: Lấy danh sách nhà
const fetchMyHouseNames = async (): Promise<string[]> => {
    try {
        const res = await fetch(`${API_URLS.PROPERTY}/houses`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const response = await res.json();
        const houses: RawHouse[] = Array.isArray(response) ? response : (response.data || []);
        return houses.map((h) => h.name); 
    } catch (error) {
        console.error("Lỗi lấy danh sách nhà:", error);
        return [];
    }
};

// API: Doanh thu Chart
const fetchRevenueChartData = async (): Promise<MonthlyRevenueDataPoint[]> => {
    try {
        const res = await fetch(`${API_URLS.INVOICE}/invoices/monthly-revenue`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return (await res.json()) as MonthlyRevenueDataPoint[];
    } catch { return []; }
};

// Lấy toàn bộ hóa đơn đã thanh toán 
const fetchAllPaidInvoices = async (): Promise<RawPaidInvoice[]> => {
    try {
        const res = await fetch(
            `${API_URLS.INVOICE}/invoices?status=Paid&pageSize=10000`, 
            { headers: getAuthHeaders() }
        );

        if (!res.ok) return [];
        const data = await res.json();
        const allPaidInvoices: RawPaidInvoice[] = Array.isArray(data) ? data : (data.data || []);
        
        return allPaidInvoices;
    } catch (error) {
        console.error("Lỗi lấy hóa đơn đã thanh toán:", error);
        return [];
    }
};

const fetchPendingInvoicesFiltered = async (myHouseNames: string[]): Promise<PendingInvoiceListItem[]> => {
    try {
        const res = await fetch(`${API_URLS.INVOICE}/invoices/pending-this-month`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const data = (await res.json()) as RawPendingInvoice[];
        
        // Lọc theo tên nhà của Owner
        const filteredData = data.filter((item) => myHouseNames.some(houseName => item.roomName && item.roomName.includes(houseName)));
        
        return filteredData.map((item) => ({
            id: item.id.toString(), tenantName: item.tenantName, roomNumber: item.roomName,
            amount: formatCurrency(item.amount), invoiceDate: new Date(item.invoiceDate).toLocaleDateString('vi-VN')
        }));
    } catch { return []; }
};

const fetchAbnormalReadingsFiltered = async (myHouseNames: string[]): Promise<AbnormalReadingListItem[]> => {
    try {
        const [electricRes, waterRes] = await Promise.all([
            fetch(`${API_URLS.READING}/MonthlyReading/abnormal-electric?threshold=500`, { headers: getAuthHeaders() }),
            fetch(`${API_URLS.READING}/MonthlyReading/abnormal-water?threshold=30`, { headers: getAuthHeaders() })
        ]);
        const electricData = electricRes.ok ? (await electricRes.json()) as RawAbnormalReading[] : [];
        const waterData = waterRes.ok ? (await waterRes.json()) as RawAbnormalReading[] : [];
        const allRawData = [ ...electricData.map((i) => ({ ...i, type: 'Electricity' as const })), ...waterData.map((i) => ({ ...i, type: 'Water' as const })) ];
        
        // Lọc theo tên nhà của Owner
        const filteredData = allRawData.filter((item) => item.houseName && myHouseNames.includes(item.houseName));
        
        return filteredData.map((item) => ({
            id: item.id.toString(), tenantName: item.tenantName || 'Unknown', roomNumber: item.roomName || 'N/A', houseName: item.houseName || 'N/A',
            type: item.type as 'Electricity' | 'Water',
            increasePercent: 0, increaseAmount: item.type === 'Electricity' ? (item.electricNew - item.electricOld) : (item.waterNew - item.waterOld)
        }));
    } catch { return []; }
};

const fetchExpiringContracts = async (): Promise<NearExpiryContractListItem[]> => {
    try {
        const res = await fetch(`${API_URLS.PROPERTY}/contracts/expiring?days=30`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const response = await res.json();
        const contracts = (response.data || []) as RawContract[];
        return contracts.map((c) => ({
            id: c.id.toString(), tenantName: c.tenantName || 'Unknown', houseName: c.houseName, roomNumber: c.roomNumber,
            endDate: new Date(c.endDate).toLocaleDateString('vi-VN'), remainingDays: calculateRemainingDays(c.endDate)
        }));
    } catch { return []; }
};

const fetchOverdueInvoicesFiltered = async (myHouseNames: string[]): Promise<OverdueInvoiceListItem[]> => {
    try {
        const res = await fetch(`${API_URLS.INVOICE}/invoices/status/Overdue`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const data = (await res.json()) as RawOverdueInvoice[];
        
        // Lọc theo tên nhà của Owner
        const filteredData = data.filter((item) => item.houseName && myHouseNames.includes(item.houseName));
        
        return filteredData.map((inv) => ({
            id: inv.id.toString(), tenantName: inv.userName || 'Unknown', houseName: inv.houseName || 'N/A', roomNumber: inv.roomName || 'N/A',
            amount: formatCurrency(inv.totalAmount), dueDate: new Date(inv.dueDate).toLocaleDateString('vi-VN'), overdueDays: calculateRemainingDays(inv.dueDate)
        }));
    } catch { return []; }
};

// Helper: Tính toán Building Performance
const fetchBuildingPerformance = async (
    allPaidInvoices: RawPaidInvoice[] 
): Promise<{ data: BuildingPerformance[]; totalRooms: number; occupiedRooms: number }> => {
    try {
        const housesRes = await fetch(`${API_URLS.PROPERTY}/houses`, { headers: getAuthHeaders() });
        if (!housesRes.ok) return { data: [], totalRooms: 0, occupiedRooms: 0 };
        
        const housesResponse = await housesRes.json();
        const houses = (housesResponse.data || housesResponse || []) as RawHouse[];

        let totalRooms = 0;
        let occupiedRooms = 0;
        const performanceData: BuildingPerformance[] = []; 

        const revenueByHouse: Record<string, number> = {};
        allPaidInvoices.forEach(inv => {
            if (inv.houseName) {
                const houseName = inv.houseName.trim();
                revenueByHouse[houseName] = (revenueByHouse[houseName] || 0) + inv.totalAmount;
            }
        });

        await Promise.all(houses.map(async (house) => {
            const roomsRes = await fetch(`${API_URLS.PROPERTY}/houses/${house.id}/rooms`, { headers: getAuthHeaders() });
            const roomsResponse = await roomsRes.json();
            const rooms = roomsResponse.data || [];

            const houseTotal = rooms.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const houseOccupied = rooms.filter((r: any) => r.status === 'Occupied' || r.status === 1 || r.status === 2).length;
            
            totalRooms += houseTotal;
            occupiedRooms += houseOccupied;

            const actualTotalRevenue = revenueByHouse[house.name.trim()] || 0;

            performanceData.push({
                buildingId: house.id.toString(),
                buildingName: house.name,
                totalRooms: houseTotal,
                vacantRooms: houseTotal - houseOccupied,
                occupiedRooms: houseOccupied,
                occupancyRate: houseTotal > 0 ? `${Math.round((houseOccupied/houseTotal)*100)}%` : '0%',
                currentMonthRevenue: formatCurrencyInMillions(actualTotalRevenue),
                rawRevenue: actualTotalRevenue 
            });
        }));

        return { data: performanceData, totalRooms, occupiedRooms };

    } catch (error) {
        console.error("Error fetching building performance:", error);
        return { data: [], totalRooms: 0, occupiedRooms: 0 };
    }
};

export const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
    console.log("🚀 Lấy dữ liệu Dashboard...");

    const myHouseNames = await fetchMyHouseNames();
    const [
        revenueData, pendingList, abnormalList, contractList, overdueList, allPaidInvoices, ticketData
    ] = await Promise.all([
        fetchRevenueChartData(),
        fetchPendingInvoicesFiltered(myHouseNames),
        fetchAbnormalReadingsFiltered(myHouseNames),
        fetchExpiringContracts(),
        fetchOverdueInvoicesFiltered(myHouseNames),
        fetchAllPaidInvoices(),
        ticketService.getAllTickets()
    ]);

    const buildingData = await fetchBuildingPerformance(allPaidInvoices);

    const parseAmount = (str: string): number => {
        if (!str) return 0;
        // 1. Loại bỏ dấu chấm (.) phân cách hàng nghìn (VD: 10.725.000 -> 10725000)
        // 2. Chỉ giữ lại số và dấu trừ
        const cleanStr = str.replace(/\./g, "").replace(/[^0-9-]/g, "");
        const val = parseFloat(cleanStr);
        return isNaN(val) ? 0 : val;
    };

    // Tính toán lại tổng tiền với hàm parseAmount 
    const pendingTotal = pendingList.reduce((sum, item) => sum + parseAmount(item.amount), 0);
    const overdueTotal = overdueList.reduce((sum, item) => sum + parseAmount(item.amount), 0);
    
    // Tính tổng doanh thu tháng này
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const paidThisMonthTotal = allPaidInvoices
        .filter(inv => {
            if (!inv.paidDate) return false;
            const d = new Date(inv.paidDate);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((sum, item) => sum + item.totalAmount, 0);

    // Tính số lượng ticket có trạng thái 1 (InProgress) và 2 (Done)
    const activeTicketsCount = ticketData.filter(ticket => ticket.status === 0 || ticket.status === 1).length;

    return {
        totalRooms: buildingData.totalRooms,
        occupiedRooms: buildingData.occupiedRooms,
        annualTurnover: '---', 
        pendingIncidents: activeTicketsCount,
        endContractsCount: contractList.length,
        abnormalReadingCount: abnormalList.length,
        invoiceSummary: {
            // Tổng cần thu = Đã thu (tháng này) + Đang chờ + Quá hạn
            totalAmount: formatCurrencyInMillions(paidThisMonthTotal + pendingTotal + overdueTotal),
            paidAmount: formatCurrencyInMillions(paidThisMonthTotal), 
            currentUnpaidAmount: formatCurrencyInMillions(pendingTotal),
            overdueAmount: formatCurrencyInMillions(overdueTotal),
        },
        revenueChartData: revenueData,
        buildingPerformanceData: buildingData.data || [], 
        overdueDetails: overdueList,
        pendingDetails: pendingList,
        abnormalReadingDetails: abnormalList,
        nearExpiryContractDetails: contractList,
    };
};