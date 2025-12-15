import Image from "next/image";
import { ReadingCardProps } from "@/types/reading";
import { mapStatusToVietnamese } from "@/utils/formatters";
import { Info } from "lucide-react";
export default function ReadingCard({ title, icon, oldValue, newValue, usedValue, status, imageUrl, isLoading, onUpload }: ReadingCardProps) {
    const statusVietnamese = mapStatusToVietnamese(status);
    const isApproved = statusVietnamese === "Đã xác nhận";
    const currentUsedValue = (newValue && oldValue) ? newValue - oldValue : usedValue;
    const isNaNValue = isNaN(newValue);
    const isNegative = !isNaNValue && (currentUsedValue || 0) < 0;

    // Kiểm tra ngưỡng bất thường (Logic mới)
    const isElectric = title.toLowerCase().includes("điện");
    const isWater = title.toLowerCase().includes("nước");
    const abnormalThreshold = isElectric ? 500 : isWater ? 30 : Infinity;

    // Giá trị tiêu thụ hợp lệ (Không âm, không NaN)
    const isValidUsedValue = !isNaNValue && !isNegative;

    // Kiểm tra bất thường chỉ khi giá trị tiêu thụ hợp lệ
    const isAbnormal = isValidUsedValue && (currentUsedValue || 0) > abnormalThreshold;

    // Xác định class cho chỉ số tiêu thụ
    let usedValueClass = "ml-1 font-medium";
    if (isValidUsedValue) {
        if (isAbnormal) {
            usedValueClass += " text-yellow-600";
        } else {
            usedValueClass += " text-green-600";
        }
    }
    const newValueClass = `font-medium ${isNegative && !isNaNValue ? "text-red-600 font-bold" : ""}`;

    return (
        <div className={`bg-white shadow p-5 rounded-xl`}>
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">{icon} {title}</h3>
                {!isApproved && (
                    <label className="cursor-pointer bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-blue-100 transition flex items-center gap-1">
                        <span>Tải ảnh lên</span>
                        <input type="file" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); }} />
                    </label>
                )}
            </div>

            <label className="block cursor-pointer mt-4">
                <input type="file" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); }} disabled={isApproved} />
                <div className="relative w-full h-[300px] bg-gray-100 flex items-center justify-center rounded-lg overflow-hidden border border-dashed border-gray-300 hover:bg-gray-50 transition">
                    {isLoading ? <div className="text-gray-500">Đang xử lý ảnh...</div> : imageUrl ? <Image src={imageUrl} alt="Ảnh chỉ số" fill className="object-contain" /> : <div className="text-gray-400 flex flex-col items-center"><span>Chọn ảnh</span></div>}
                </div>
            </label>

            <div className="mt-4 space-y-2 text-sm">
                <p>Chỉ số tháng trước: <span className="font-medium">{oldValue}</span></p>

                <p>Chỉ số tháng này:
                    {isNaNValue ? (
                        <span className="ml-1 text-red-500 font-medium">
                            Ảnh mờ hoặc không phải ảnh đồng hồ. Vui lòng upload lại!
                        </span>
                    ) : (
                        <span className={newValueClass}>
                            {newValue}
                        </span>
                    )}
                </p>

                {isValidUsedValue && (
                    <p>Chỉ số tiêu thụ:
                        <span className={usedValueClass}>
                            {currentUsedValue}
                        </span>
                        {isAbnormal && (
                            <div className="relative group flex items-center">
                                <span className="text-yellow-600 ml-2 font-medium">(Chỉ số bất thường)</span>

                                <Info className="w-4 h-4 text-yellow-600 ml-1 cursor-pointer hover:text-yellow-700 transition" />
                                <div className="absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                                    <p className="font-semibold text-red-400 mb-1">Cảnh báo Bất thường!</p>
                                    <p>Chỉ số tiêu thụ tháng này vượt quá ngưỡng quy định ({isElectric ? '> 500' : '> 30'}). Vui lòng kiểm tra lại ảnh đã nộp.</p>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800"></div>
                                </div>
                            </div>
                        )}
                    </p>
                )}

                {isNaNValue && (
                    <p className="text-gray-400">Chỉ số tiêu thụ tháng này: <span className="ml-1">0</span></p>
                )}

                <p>Trạng thái:
                    <span> </span>
                    <span className={statusVietnamese === "Đã xác nhận" ? "font-medium text-green-600" : ""}>
                        {statusVietnamese}
                    </span>
                </p>
            </div>
        </div>
    );
}