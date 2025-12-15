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
using NotificationService.Services; 
using System.Globalization;
using NotificationService.DTOs;
using NotificationService.DTOs.Invoice;
using NotificationService.DTOs.Reading;
using System.Collections.Generic;
using System.Linq;

namespace NotificationService.Services
{
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

                        case NotificationType.ReadingAnomaly: // ⭐️ CASE MỚI ⭐️
                                // Deserialize BƯỚC 2: DTO của Anomaly
                                var anomalyMessage = JsonSerializer.Deserialize<AnomalyNotificationMessage>(message, _jsonOptions);
                                await HandleReadingAnomaly(anomalyMessage, repository); // Gọi hàm xử lý mới
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

            var culture = new CultureInfo("vi-VN");

            foreach (var tenant in message.TenantsToNotify)
            {
                var tenantInfo = tenant.TenantInfo;
                var totalAmount = tenant.UnpaidInvoices.Sum(i => i.AmountDue);
                
                // --- 1. Gửi Email (HTML Format) ---
                string emailSubject = $"[NHẮC THANH TOÁN] Bạn có {tenant.UnpaidInvoices.Count} hóa đơn chưa thanh toán.";
                
                var invoiceTable = new StringBuilder();
                invoiceTable.AppendLine("<table style='width: 100%; border-collapse: collapse; margin-top: 15px;'>");
                invoiceTable.AppendLine("<thead><tr style='background-color: #f2f2f2;'>");
                invoiceTable.AppendLine("<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>ID Hóa đơn</th>");
                invoiceTable.AppendLine("<th style='border: 1px solid #ddd; padding: 8px; text-align: right;'>Số tiền (VND)</th>");
                invoiceTable.AppendLine("<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Ngày đáo hạn</th>");
                invoiceTable.AppendLine("</tr></thead><tbody>");

                foreach(var inv in tenant.UnpaidInvoices)
                {
                    invoiceTable.AppendLine("<tr>");
                    invoiceTable.AppendLine($"<td style='border: 1px solid #ddd; padding: 8px;'>{inv.InvoiceId}</td>");
                    invoiceTable.AppendLine($"<td style='border: 1px solid #ddd; padding: 8px; text-align: right;'>{inv.AmountDue.ToString("N0", culture)}</td>");
                    invoiceTable.AppendLine($"<td style='border: 1px solid #ddd; padding: 8px;'>{inv.DueDate:dd/MM/yyyy}</td>");
                    invoiceTable.AppendLine("</tr>");
                }
                invoiceTable.AppendLine("</tbody></table>");
                
                var emailBodyHtml = new StringBuilder();
                emailBodyHtml.AppendLine("<html><body>");
                emailBodyHtml.AppendLine($"<p>Kính gửi khách hàng: <strong>{tenantInfo.FullName}</strong>,</p>");
                emailBodyHtml.AppendLine($"<p>Quản lý gửi thông báo này để nhắc nhở bạn về <strong>{tenant.UnpaidInvoices.Count} hóa đơn</strong> chưa thanh toán.</p>");
                emailBodyHtml.AppendLine("<p>Vui lòng kiểm tra chi tiết dưới đây và hoàn tất thanh toán trước ngày đáo hạn:</p>");
                
                emailBodyHtml.AppendLine(invoiceTable.ToString()); // Thêm bảng hóa đơn
                
                emailBodyHtml.AppendLine($"<h3 style='color: #007bff;'>Tổng số tiền cần thanh toán: {totalAmount.ToString("N0", culture)} VND.</h3>");
                emailBodyHtml.AppendLine("<p>Xin cảm ơn và trân trọng,<br/>Quản lý trọ</p>");
                emailBodyHtml.AppendLine("</body></html>");

                await _emailService.SendEmailAsync(tenantInfo.Email, emailSubject, emailBodyHtml.ToString(), isHtml: true); // ⭐️ THÊM isHtml: true ⭐️

                // --- 2. LƯU DB (Giữ nguyên) ---
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
                string emailBodyHtml;

                if (message.Type == NotificationType.NewCycle)
                {
                    emailSubject = "[THÔNG BÁO] Chu kỳ đọc chỉ số mới đã bắt đầu.";
                    dbMessage = $"Chu kỳ đọc chỉ số mới (ID: {message.ReadingCycleId}) đã được mở. Vui lòng chuẩn bị nộp chỉ số.";
                    
                    // HTML Body cho New Cycle
                    emailBodyHtml = $"<html><body>" +
                                    $"<p>Kính gửi khách hàng: <strong>{customer.FullName}</strong>,</p>" +
                                    $"<p>Chúng tôi xin thông báo rằng chu kỳ đọc chỉ số tiêu thụ điện nước mới đã chính thức bắt đầu (ngày 20 hàng tháng)!</p>" +
                                    $"<p style='padding: 10px; background-color: #e6f7ff; border-left: 5px solid #007bff;'><strong>Chi tiết chu kỳ:</strong> Tháng {message.CycleMonth} năm {message.CycleYear}.</p>" +
                                    $"<p>Vui lòng <a href='[LINK_DEN_TRANG_NOP_CHI_SO]' style='color: #28a745; font-weight: bold;'>truy cập website</a> để nộp chỉ số điện nước của phòng bạn.</p>" +
                                    $"<p>Xin cảm ơn và trân trọng,<br/>Quản lý trọ</p>" +
                                    $"</body></html>";
                }
                else // RemindSubmission
                {
                    emailSubject = $"[NHẮC NHỞ] Nộp chỉ số điện nước Chu kỳ {message.CycleMonth}/{message.CycleYear}."; 
                
                    dbMessage = $"Bạn chưa nộp chỉ số điện nước cho chu kỳ {message.CycleMonth}/{message.CycleYear}. Vui lòng nộp sớm.";
                
                    // HTML Body cho Remind Submission
                    emailBodyHtml = $"<html><body>" +
                                    $"<p>Kính gửi khách hàng: <strong>{customer.FullName}</strong>,</p>" +
                                    $"<p style='color: #dc3545; font-weight: bold;'>Bạn vẫn chưa nộp chỉ số tiêu thụ điện nước cho tháng hiện tại: {message.CycleMonth} năm {message.CycleYear}.</p>" +
                                    $"<p>Vui lòng nộp chỉ số sớm nhất có thể. <strong>Hạn cuối là ngày 25 của tháng.</strong></p>" +
                                    $"<p>Lưu ý: Nếu chỉ số không được nộp đúng hạn, chỉ số sẽ được tính vào tháng sau và có thể phụ thu thêm phí nộp trễ theo quy định.</p>" +
                                    $"<p>Trân trọng cảm ơn.</p>" +
                                    $"<p>Quản lý trọ.</p>" +
                                    $"</body></html>";
                }
            
                // 1. Gửi Email (Sử dụng HTML Body)
                await _emailService.SendEmailAsync(customer.Email, emailSubject, emailBodyHtml, isHtml: true); // ⭐️ THÊM isHtml: true ⭐️

                // 2. LƯU DB (Giữ nguyên)
                await repository.AddAsync(new Notification
                {
                    UserId = customer.Id,
                    Message = dbMessage,
                    Type = message.Type
                });
                
                Console.WriteLine($"[DB] Saved {message.Type} for User {customer.Id}");
            }
        }

        private async Task HandleReadingAnomaly(AnomalyNotificationMessage message, INotificationRepository repository)
        {
            if (message == null) return;

            var culture = new CultureInfo("vi-VN");
            var subject = "[CẢNH BÁO] Tiêu thụ BẤT THƯỜNG - Phòng/Khách hàng cần kiểm tra gấp!";
            
            // --- 1. Soạn Email cho Owner (HTML Format) ---
            var emailBodyHtml = new StringBuilder();
            emailBodyHtml.AppendLine("<html><body>");
            emailBodyHtml.AppendLine("<h2 style='color: #dc3545;'>CẢNH BÁO TIÊU THỤ BẤT THƯỜNG ĐÃ ĐƯỢC PHÁT HIỆN</h2>");
            emailBodyHtml.AppendLine("<p>Kính gửi Quản lý trọ,</p>");
            emailBodyHtml.AppendLine("<p>Hệ thống phát hiện mức tiêu thụ điện nước bất thường cho một khách hàng, cần được kiểm tra ngay:</p>");
            
            emailBodyHtml.AppendLine("<ul style='list-style-type: none; padding: 10px; border: 1px solid #ccc; background-color: #fff3cd;'>");
            emailBodyHtml.AppendLine($"<li><strong>Khách hàng ID:</strong> {message.TenantId}</li>");
            emailBodyHtml.AppendLine($"<li><strong>Chu kỳ:</strong> {message.CycleMonth}/{message.CycleYear}</li>");

            if (message.IsElectricAnomaly)
            {
                emailBodyHtml.AppendLine($"<li style='color: #dc3545; font-weight: bold;'>⚡️ ĐIỆN BẤT THƯỜNG: {message.ElectricUsage.ToString("N0", culture)} kWh (Ngưỡng > 500)</li>");
            }
            else
            {
                emailBodyHtml.AppendLine($"<li>⚡️ Điện bình thường: {message.ElectricUsage.ToString("N0", culture)} kWh</li>");
            }

            if (message.IsWaterAnomaly)
            {
                emailBodyHtml.AppendLine($"<li style='color: #dc3545; font-weight: bold;'>💧 NƯỚC BẤT THƯỜNG: {message.WaterUsage} m³ (Ngưỡng > 30)</li>");
            }
            else
            {
                emailBodyHtml.AppendLine($"<li>💧 Nước bình thường: {message.WaterUsage} m³</li>");
            }

            emailBodyHtml.AppendLine("</ul>");
            
            emailBodyHtml.AppendLine("<p style='margin-top: 20px;'><strong>HÀNH ĐỘNG CẦN THIẾT:</strong> Vui lòng kiểm tra ngay lập tức để xác nhận tính chính xác của chỉ số hoặc tìm nguyên nhân rò rỉ/sử dụng quá mức.</p>");
            emailBodyHtml.AppendLine("<p>Trân trọng.</p>");
            emailBodyHtml.AppendLine("</body></html>");
            
            // Gửi đến Owner qua email mà ReadingService đã cung cấp
            await _emailService.SendEmailAsync(message.RecipientEmail, subject, emailBodyHtml.ToString(), isHtml: true); // ⭐️ THÊM isHtml: true ⭐️

            // --- 2. LƯU DB (Giữ nguyên) ---
            var anomalyType = (message.IsElectricAnomaly ? "Điện" : "") + (message.IsWaterAnomaly ? (message.IsElectricAnomaly ? " & Nước" : "Nước") : "");
            var dbMessage = $"Cảnh báo Tiêu thụ Bất thường ({anomalyType}) từ khách hàng ID: {message.TenantId}. Điện: {message.ElectricUsage}, Nước: {message.WaterUsage}.";

            await repository.AddAsync(new Notification
            {
                UserId = message.UserId, 
                Message = dbMessage,
                Type = NotificationType.ReadingAnomaly
            });
            
            Console.WriteLine($"[DB] Saved Anomaly Notification for Owner (via Tenant {message.TenantId})");
        }
        public override void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
            base.Dispose();
        }
    }


}