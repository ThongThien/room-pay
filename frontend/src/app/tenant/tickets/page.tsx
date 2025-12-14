'use client';

import { useState, useEffect } from 'react';
import { ticketService } from "@/services/ticketService";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

// Validation limits
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

export default function TenantTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ title?: string; description?: string }>({});

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await ticketService.getMyTickets();
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await ticketService.create(createForm);
      setCreateForm({ title: '', description: '' });
      setIsCreateDialogOpen(false);
      setValidationErrors({});
      fetchTickets(); // Refresh the list
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setSubmitting(false);
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

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const validateForm = () => {
    const errors: { title?: string; description?: string } = {};

    if (!createForm.title.trim()) {
      errors.title = 'Tiêu đề không được để trống';
    } else if (createForm.title.length > TITLE_MAX_LENGTH) {
      errors.title = `Tiêu đề không được vượt quá ${TITLE_MAX_LENGTH} ký tự`;
    }

    if (!createForm.description.trim()) {
      errors.description = 'Mô tả không được để trống';
    } else if (createForm.description.length > DESCRIPTION_MAX_LENGTH) {
      errors.description = `Mô tả không được vượt quá ${DESCRIPTION_MAX_LENGTH} ký tự`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: 'title' | 'description', value: string) => {
    // Enforce max length
    const maxLength = field === 'title' ? TITLE_MAX_LENGTH : DESCRIPTION_MAX_LENGTH;
    const truncatedValue = value.slice(0, maxLength);

    setCreateForm(prev => ({ ...prev, [field]: truncatedValue }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatDate = (dateString: string) => {
    // Check if it's the default DateTime value from C# (0001-01-01)
    const date = new Date(dateString);
    if (date.getFullYear() === 1 && date.getMonth() === 0 && date.getDate() === 1) {
      return '';
    }
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản lý yêu cầu</h2>
            <p className="text-gray-500 text-sm">Xem và tạo yêu cầu hỗ trợ</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="p-4 border-b">Tiêu đề</th>
                  <th className="p-4 border-b">Trạng thái</th>
                  <th className="p-4 border-b">Ngày tạo</th>
                  <th className="p-4 border-b text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="p-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-24 mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý yêu cầu</h2>
          <p className="text-gray-500 text-sm">Xem và tạo yêu cầu hỗ trợ</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Tạo yêu cầu mới</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo yêu cầu mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <Label htmlFor="title">Tiêu đề</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
                  required
                  maxLength={TITLE_MAX_LENGTH}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className={validationErrors.title ? 'text-red-500' : ''}>
                    {validationErrors.title}
                  </span>
                  <span>{createForm.title.length}/{TITLE_MAX_LENGTH}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  required
                  maxLength={DESCRIPTION_MAX_LENGTH}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className={validationErrors.description ? 'text-red-500' : ''}>
                    {validationErrors.description}
                  </span>
                  <span>{createForm.description.length}/{DESCRIPTION_MAX_LENGTH}</span>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Tạo yêu cầu'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Chưa có yêu cầu nào.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <TableHead className="p-4 border-b">Tiêu đề</TableHead>
                  <TableHead className="p-4 border-b">Trạng thái</TableHead>
                  <TableHead className="p-4 border-b">Ngày tạo</TableHead>
                  <TableHead className="p-4 border-b text-center">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-sm">
                {tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <TableCell className="p-4 font-medium">{ticket.title}</TableCell>
                    <TableCell className="p-4">
                      <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                        {statusLabels[ticket.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4">{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell className="p-4 text-center">
                      {ticket.status !== 2 && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTicket(ticket.id);
                          }}
                          variant="outline"
                        >
                          Đóng yêu cầu
                        </Button>
                      )}
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
        onCloseTicket={handleCloseTicket}
      />
    </div>
  );
}
