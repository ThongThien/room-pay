import Image from "next/image";
import { ReadingCardProps } from "@/types/reading";
import { mapStatusToVietnamese } from "@/utils/formatters";

export default function ReadingCard({ title, icon, oldValue, newValue, usedValue, status, imageUrl, isLoading, onUpload }: ReadingCardProps) {
    const statusVietnamese = mapStatusToVietnamese(status);
    const isApproved = statusVietnamese === "Đã xác nhận";
    const isNegative = (usedValue || 0) < 0;
    const isNaNValue = isNaN(newValue);

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
                    {isNaNValue ? <span className="ml-1">NaN</span> : <span className={`font-medium ${isNegative ? "text-red-600 font-bold" : ""}`}>{newValue}</span>}
                </p>
                <p>Chỉ số tiêu thụ: 
                    {isNaNValue ? <span className="text-gray-400 ml-1">---</span> : <><span className={`ml-1 font-medium ${isNegative ? "text-red-600 font-bold" : ""}`}>{usedValue}</span>{isNegative && <span className="text-red-500 ml-2">(Không hợp lệ)</span>}</>}
                </p>
                <p>Trạng thái: {statusVietnamese}</p>
            </div>
        </div>
    );
}