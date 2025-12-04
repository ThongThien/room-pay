export interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    productCode: string;
}

export interface Invoice {
    id: number;
    userId: string;
    userName?: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    status: "Paid" | "Unpaid" | string; 
    paidDate?: string;
    items: InvoiceItem[];
}