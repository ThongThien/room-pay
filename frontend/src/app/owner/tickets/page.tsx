'use client';

import { useState, useEffect } from 'react';
import { ticketService } from "@/services/ticketService";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TicketDetailModal from '@/components/ticket/TicketDetailModal';
import { Ticket } from '@/types/ticket';

const statusLabels = {
  0: 'Chờ xử lý',
  1: 'Đang xử lý',
  2: 'Hoàn thành'
};

const statusColors = {
  0: 'bg-yellow-100 text-yellow-800',
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800'
};

export default function OwnerTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await ticketService.getAllTickets();
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const handleAcceptTicket = async (ticketId: number) => {
    try {
      await ticketService.accept(ticketId);
      fetchTickets(); // Refresh the list
    } catch (error) {
      console.error('Error accepting ticket:', error);
    }
  };

  const handleCloseTicket = async (ticketId: number) => {
    try {
      await ticketService.close(ticketId);
      fetchTickets(); // Refresh the list
    } catch (error) {
      console.error('Error closing ticket:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý yêu cầu hỗ trợ</h2>
          <p className="text-gray-500 text-sm">Xem và xử lý yêu cầu từ người thuê</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {tickets.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Chưa có yêu cầu nào.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <TableHead className="px-3 py-2 border-b w-16">Mã ticket</TableHead>
                  <TableHead className="px-3 py-2 border-b w-24">Toà nhà</TableHead>
                  <TableHead className="px-3 py-2 border-b w-20">Số phòng</TableHead>
                  <TableHead className="px-3 py-2 border-b w-32">Tên người thuê</TableHead>
                  <TableHead className="px-3 py-2 border-b min-w-32">Tiêu đề</TableHead>
                  <TableHead className="px-3 py-2 border-b min-w-40">Mô tả</TableHead>
                  <TableHead className="px-3 py-2 border-b w-24">Ngày mở</TableHead>
                  <TableHead className="px-3 py-2 border-b w-20">Trạng thái</TableHead>
                  <TableHead className="px-3 py-2 border-b text-center w-24">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <TableCell className="px-3 py-2 font-medium">#{ticket.id}</TableCell>
                    <TableCell className="px-3 py-2">{ticket.houseName || 'N/A'}</TableCell>
                    <TableCell className="px-3 py-2">{ticket.roomName || 'N/A'}</TableCell>
                    <TableCell className="px-3 py-2 max-w-32 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.tenantName || 'N/A'}</TableCell>
                    <TableCell className="px-3 py-2 font-medium max-w-32 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.title}</TableCell>
                    <TableCell className="px-3 py-2 max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">{ticket.description}</TableCell>
                    <TableCell className="px-3 py-2">{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge className={`${statusColors[ticket.status as keyof typeof statusColors]} text-xs px-2 py-1`}>
                        {statusLabels[ticket.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-center">
                      <div className="flex justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        {ticket.status === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcceptTicket(ticket.id)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 text-xs px-2 py-1 h-7"
                          >
                            Chấp nhận
                          </Button>
                        )}
                        {ticket.status === 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCloseTicket(ticket.id)}
                            className="text-green-600 border-green-600 hover:bg-green-50 text-xs px-2 py-1 h-7"
                          >
                            Đóng
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}