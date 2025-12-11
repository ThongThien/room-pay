
export interface ReadingCardProps {
    title: string;
    icon: string;
    oldValue: number;
    newValue: number;
    usedValue?: number;
    status: string | number;
    imageUrl: string;
    isLoading?: boolean;
    onUpload: (file: File) => void;
}

export interface ReadingValue {
    old: number;
    new: number;
    img: string;
    status: string | number;
}

export interface ReadingCycle {
    id: number;
    cycleMonth: number;
    cycleYear: number;
}