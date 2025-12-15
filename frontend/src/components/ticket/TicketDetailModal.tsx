import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket } from '@/types/ticket';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onCloseTicket?: (ticketId: number) => void;
}

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

export default function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  onCloseTicket
}: TicketDetailModalProps) {
  if (!ticket) return null;

  const isValidDate = (dateString: string | undefined) => {
    if (!dateString) return false;
    // Check if it's the default DateTime value from C# (0001-01-01)
    const date = new Date(dateString);
    return date.getFullYear() !== 1 || date.getMonth() !== 0 || date.getDate() !== 1;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    // Check if it's the default DateTime value from C# (0001-01-01)
    const date = new Date(dateString);
    if (date.getFullYear() === 1 && date.getMonth() === 0 && date.getDate() === 1) {
      return '';
    }
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Chi tiết yêu cầu</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{ticket.title}</h3>
              <p className="text-sm text-gray-500">ID: #{ticket.id}</p>
            </div>
            <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
              {statusLabels[ticket.status as keyof typeof statusLabels]}
            </Badge>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Mô tả</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Additional Info */}
          {(ticket.houseName || ticket.roomName || ticket.tenantName) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Thông tin liên quan</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {ticket.houseName && (
                  <p className="text-sm">
                    <span className="font-medium">Nhà:</span> {ticket.houseName}
                  </p>
                )}
                {ticket.roomName && (
                  <p className="text-sm">
                    <span className="font-medium">Phòng:</span> {ticket.roomName}
                  </p>
                )}
                {ticket.tenantName && (
                  <p className="text-sm">
                    <span className="font-medium">Người thuê:</span> {ticket.tenantName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Thời gian</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="font-medium">Ngày tạo:</span> {formatDate(ticket.createdAt)}
              </p>
              {isValidDate(ticket.updatedAt) && ticket.updatedAt !== ticket.createdAt && (
                <p className="text-sm">
                  <span className="font-medium">Cập nhật:</span> {formatDate(ticket.updatedAt)}
                </p>
              )}
              {isValidDate(ticket.closedAt) && (
                <p className="text-sm">
                  <span className="font-medium">Đóng:</span> {formatDate(ticket.closedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {ticket.status !== 2 && onCloseTicket && (
              <Button
                onClick={() => {
                  onCloseTicket(ticket.id);
                  onClose();
                }}
                variant="outline"
              >
                Đóng yêu cầu
              </Button>
            )}
            <Button onClick={onClose} variant="default">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}