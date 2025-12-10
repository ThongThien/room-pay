using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NotificationService.Repositories;
using NotificationService.Models;
using NotificationService.Models.Enums;
using NotificationService.Services; // Giả định IEmailService nằm trong đây
using System.Globalization;
using NotificationService.DTOs;
using NotificationService.DTOs.Invoice;
using NotificationService.DTOs.Reading;
using System.Collections.Generic;

namespace NotificationService.Services
{
    // Cấu trúc DTOs cần được đặt trong thư mục DTOs của NotificationService
    // DTOs/BaseNotificationMessage.cs
    // DTOs/Invoice/InvoiceNotificationMessage.cs, TenantUnpaidNotification.cs, UnpaidInvoiceDetail.cs
    // DTOs/Reading/ReadingNotificationMessage.cs
    // DTOs/User/UserInfo.cs

    public class RabbitMQWorker : BackgroundService
    {
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly IServiceScopeFactory _serviceScopeFactory;
        
        private IConnection _connection;
        private IModel _channel;
        private readonly string _queueName;
        private readonly JsonSerializerOptions _jsonOptions;

        // Constructor
        public RabbitMQWorker(IConfiguration configuration, IEmailService emailService,
                              IServiceScopeFactory serviceScopeFactory) 
        {
            _configuration = configuration;
            _emailService = emailService;
            _serviceScopeFactory = serviceScopeFactory;
            _queueName = _configuration["RabbitMQ:QueueName"] ?? "notification_queue";
            
            // Cấu hình JsonSerializerOptions
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() } 
            };

            InitializeRabbitMqListener();
        }

        // Khởi tạo kết nối RabbitMQ
        private void InitializeRabbitMqListener()
        {
            var factory = new ConnectionFactory()
            {
                HostName = _configuration["RabbitMQ:HostName"] ?? "localhost",
                Port = int.Parse(_configuration["RabbitMQ:Port"] ?? "5672"),
                UserName = _configuration["RabbitMQ:UserName"] ?? "guest",
                Password = _configuration["RabbitMQ:Password"] ?? "guest",
            };

            try
            {
                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();
                _channel.QueueDeclare(queue: _queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
                Console.WriteLine($"[RabbitMQ] Listening for messages on queue: {_queueName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RabbitMQ ERROR] Could not connect or initialize queue: {ex.Message}");
            }
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (_channel == null) return Task.CompletedTask;

            stoppingToken.ThrowIfCancellationRequested();

            var consumer = new EventingBasicConsumer(_channel);
            consumer.Received += async (model, ea) =>
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);
                Console.WriteLine($"[RECEIVED] Message from queue: {message}");

                await HandleMessage(message); 

                _channel.BasicAck(ea.DeliveryTag, multiple: false);
            };

            _channel.BasicConsume(queue: _queueName, autoAck: false, consumer: consumer);

            return Task.CompletedTask;
        }

        // Logic chính xử lý tin nhắn (Sử dụng Deserialize 2 bước)
        private async Task HandleMessage(string message)
        {
            try
            {
                // 1. DESERIALIZE BƯỚC 1: Lấy Type để phân loại
                var baseMessage = JsonSerializer.Deserialize<BaseNotificationMessage>(message, _jsonOptions);

                if (baseMessage == null) return;
                
                // Tạo scope mới cho Scoped services (DbContext/Repository)
                using (var scope = _serviceScopeFactory.CreateScope())
                {
                    var repository = scope.ServiceProvider.GetRequiredService<INotificationRepository>();

                    switch (baseMessage.Type)
                    {
                        case NotificationType.RemindPayment:
                            // Deserialize BƯỚC 2: DTO của InvoiceService
                            var invoiceMessage = JsonSerializer.Deserialize<InvoiceNotificationMessage>(message, _jsonOptions);
                            await HandlePaymentReminder(invoiceMessage, repository);
                            break;

                        case NotificationType.NewCycle:
                        case NotificationType.RemindSubmission:
                            // Deserialize BƯỚC 2: DTO của ReadingService
                            var readingMessage = JsonSerializer.Deserialize<ReadingNotificationMessage>(message, _jsonOptions);
                            await HandleReadingNotification(readingMessage, repository);
                            break;

                        default:
                            Console.WriteLine($"[WARNING] Unknown Notification Type: {baseMessage.Type}");
                            break;
                    }
                }
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"[ERROR] Failed to deserialize message or DTO mismatch: {ex.Message}. Message: {message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] General processing error in HandleMessage: {ex.Message}");
            }
        }

        // === HÀM XỬ LÝ RIÊNG BIỆT CHO TỪNG LOẠI THÔNG BÁO ===

        private async Task HandlePaymentReminder(InvoiceNotificationMessage message, INotificationRepository repository)
        {
            if (message?.TenantsToNotify == null) return;

            foreach (var tenant in message.TenantsToNotify)
            {
                var tenantInfo = tenant.TenantInfo;
                var totalAmount = tenant.UnpaidInvoices.Sum(i => i.AmountDue);
                
                // 1. Gửi Email
                string emailSubject = $"[NHẮC THANH TOÁN] Bạn có {tenant.UnpaidInvoices.Count} hóa đơn chưa thanh toán.";
                var emailBody = BuildPaymentReminderBody(tenantInfo.FullName, tenant.UnpaidInvoices);
                await _emailService.SendEmailAsync(tenantInfo.Email, emailSubject, emailBody);

                // 2. LƯU DB
                var culture = new CultureInfo("vi-VN");
                var dbMessage = $"Nhắc thanh toán {tenant.UnpaidInvoices.Count} hóa đơn. Tổng: {totalAmount.ToString("N0", culture)} VND.";
                
                await repository.AddAsync(new Notification
                {
                    UserId = tenantInfo.Id,
                    Message = dbMessage,
                    Type = NotificationType.RemindPayment
                });
                
                Console.WriteLine($"[DB] Saved payment reminder for User {tenantInfo.Id}");
            }
        }

        private async Task HandleReadingNotification(ReadingNotificationMessage message, INotificationRepository repository)
        {
            if (message?.CustomersToNotify == null) return;

            foreach (var customer in message.CustomersToNotify)
            {
                string emailSubject;
                string dbMessage;

                if (message.Type == NotificationType.NewCycle)
                {
                    emailSubject = "[THÔNG BÁO] Chu kỳ đọc chỉ số mới đã bắt đầu.";
                    dbMessage = $"Chu kỳ đọc chỉ số mới (ID: {message.ReadingCycleId}) đã được mở. Vui lòng chuẩn bị nộp chỉ số.";
                }
                else // RemindSubmission
                {
                    emailSubject = "[NHẮC NHỞ] Vui lòng nộp chỉ số điện nước.";
                    dbMessage = $"Bạn chưa nộp chỉ số điện nước cho chu kỳ gần nhất (ID: {message.ReadingCycleId}). Vui lòng nộp sớm.";
                }
                
                // 1. Gửi Email (Tạm dùng dbMessage làm body)
                await _emailService.SendEmailAsync(customer.Email, emailSubject, dbMessage); 

                // 2. LƯU DB
                await repository.AddAsync(new Notification
                {
                    UserId = customer.Id,
                    Message = dbMessage,
                    Type = message.Type
                });
                
                Console.WriteLine($"[DB] Saved {message.Type} for User {customer.Id}");
            }
        }
        
        // Hàm hỗ trợ tạo nội dung Email HTML cho nhắc thanh toán
        private string BuildPaymentReminderBody(string fullName, List<UnpaidInvoiceDetail> invoices)
        {
            var html = new StringBuilder();
            var culture = new CultureInfo("vi-VN");
            
            html.AppendLine($"<!DOCTYPE html><html><body>");
            html.AppendLine($"<p>Xin chào <strong>{fullName}</strong>,</p>");
            html.AppendLine($"<p>Bộ phận quản lý gửi thông báo này để nhắc nhở bạn về các hóa đơn chưa thanh toán. Vui lòng kiểm tra chi tiết dưới đây và hoàn tất thanh toán trước ngày đáo hạn.</p>");
            
            html.AppendLine("<table border='1' style='border-collapse: collapse; width: 100%;'><tr><th>ID Hóa đơn</th><th>Số tiền</th><th>Ngày đáo hạn</th></tr>");
            
            foreach(var inv in invoices)
            {
                html.AppendLine($"<tr><td>{inv.InvoiceId}</td><td>{inv.AmountDue.ToString("N0", culture)} VND</td><td>{inv.DueDate:dd/MM/yyyy}</td></tr>");
            }
            html.AppendLine("</table>");
            html.AppendLine("<p>Xin cảm ơn và trân trọng,</p>");
            html.AppendLine("</body></html>");
            return html.ToString();
        }

        // Đóng kết nối khi service dừng
        public override void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
            base.Dispose();
        }
    }
}