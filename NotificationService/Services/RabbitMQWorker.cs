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
                
                // --- 1. Gửi Email (Plain Text Inline) ---
                string emailSubject = $"[NHẮC THANH TOÁN] Bạn có {tenant.UnpaidInvoices.Count} hóa đơn chưa thanh toán.";
                
                var emailBody = new StringBuilder();
                emailBody.AppendLine($"Kính gửi khách hàng \"thân yêu\" của tôi: {tenantInfo.FullName},");
                emailBody.AppendLine($"Quản lý gửi thông báo này để nhắc nhở bạn về {tenant.UnpaidInvoices.Count} hóa đơn chưa thanh toán.");
                emailBody.AppendLine("Vui lòng kiểm tra chi tiết dưới đây và hoàn tất thanh toán trước ngày đáo hạn:");
                emailBody.AppendLine("---");
                foreach(var inv in tenant.UnpaidInvoices)
                {
                    emailBody.AppendLine($"- ID Hóa đơn: {inv.InvoiceId}, Số tiền: {inv.AmountDue.ToString("N0", culture)} VND, Ngày đáo hạn: {inv.DueDate:dd/MM/yyyy}");
                }
                emailBody.AppendLine("---");
                emailBody.AppendLine($"Tổng số tiền cần thanh toán: {totalAmount.ToString("N0", culture)} VND.");
                emailBody.AppendLine("Xin cảm ơn và trân trọng, Quản lý trọ");

                await _emailService.SendEmailAsync(tenantInfo.Email, emailSubject, emailBody.ToString()); 

                // --- 2. LƯU DB ---
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
                string emailBody;

                if (message.Type == NotificationType.NewCycle)
                {
                    emailSubject = "[THÔNG BÁO] Chu kỳ đọc chỉ số mới đã bắt đầu.";
                    dbMessage = $"Chu kỳ đọc chỉ số mới (ID: {message.ReadingCycleId}) đã được mở. Vui lòng chuẩn bị nộp chỉ số.";
                    
                    // Plain Text Body cho New Cycle
                    emailBody = $"Kính gửi  khách hàng \"thân yêu\" của tôi: {customer.FullName}." +
                                $"Chúng tôi xin thông báo rằng chu kỳ đọc chỉ số tiêu thụ điện nước mới đã chính thức bắt đầu (ngày 20 hàng tháng)!" +
                                $"Chi tiết chu kỳ: Tháng {message.CycleMonth} năm {message.CycleYear}.\n\n" +
                                $"Vui lòng truy cập website để nộp chỉ số điện nước của phòng bạn. Xin cảm ơn! Quản lý trọ";
                }
                else // RemindSubmission
                {
                    emailSubject = $"[NHẮC NHỞ] Nộp chỉ số điện nước Chu kỳ {message.CycleMonth}/{message.CycleYear}."; 
            
                    dbMessage = $"Bạn chưa nộp chỉ số điện nước cho chu kỳ {message.CycleMonth}/{message.CycleYear}. Vui lòng nộp sớm.";
            
                    // Plain Text Body cho Remind Submission
                    emailBody = $"Kính gửi khách hàng \"thân yêu\" của tôi: {customer.FullName}." +
                                $"Bạn vẫn chưa nộp chỉ số tiêu thụ điện nước cho tháng hiện tại: {message.CycleMonth} năm {message.CycleYear}." +
                                $"Vui lòng nộp chỉ số sớm nhất có thể. Hạn cuối là ngày 25 của tháng." +
                                $"Nếu chỉ số không được nộp đúng hạn, chỉ số sẽ được tính vào tháng sau và phụ thu thêm phí nộp trễ." +
                                $"Trân trọng cảm ơn." +
                                $"Quản lý trọ.";
                }
            
                // 1. Gửi Email (Sử dụng Plain Text Body)
                await _emailService.SendEmailAsync(customer.Email, emailSubject, emailBody); 

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

        private async Task HandleReadingAnomaly(AnomalyNotificationMessage message, INotificationRepository repository)
        {
            if (message == null) return;

            var culture = new CultureInfo("vi-VN");
            var subject = "[CẢNH BÁO] Tiêu thụ BẤT THƯỜNG - Phòng/Khách hàng cần kiểm tra gấp!";
            
            // --- 1. Soạn Email cho Owner ---
            var emailBody = new StringBuilder();
            emailBody.AppendLine("Kính gửi Quản lý trọ,");
            emailBody.AppendLine($"Hệ thống phát hiện mức tiêu thụ điện nước bất thường cho một khách hàng:");
            emailBody.AppendLine("---");
            emailBody.AppendLine($"* Khách hàng ID: {message.TenantId}");
            emailBody.AppendLine($"* Chu kỳ: {message.CycleMonth}/{message.CycleYear}");

            if (message.IsElectricAnomaly)
            {
                emailBody.AppendLine($"* ⚡️ **ĐIỆN BẤT THƯỜNG:** {message.ElectricUsage.ToString("N0", culture)} kWh (Ngưỡng > 500)");
            }
            else
            {
                emailBody.AppendLine($"* ⚡️ Điện bình thường: {message.ElectricUsage.ToString("N0", culture)} kWh");
            }

            if (message.IsWaterAnomaly)
            {
                emailBody.AppendLine($"* 💧 **NƯỚC BẤT THƯỜNG:** {message.WaterUsage} m³ (Ngưỡng > 30)");
            }
            else
            {
                emailBody.AppendLine($"* 💧 Nước bình thường: {message.WaterUsage} m³");
            }

            emailBody.AppendLine("---");
            emailBody.AppendLine("Vui lòng kiểm tra ngay lập tức để xác nhận tính chính xác của chỉ số hoặc tìm nguyên nhân rò rỉ/sử dụng quá mức.");
            emailBody.AppendLine("Trân trọng.");
            
            // Gửi đến Owner qua email mà ReadingService đã cung cấp
            await _emailService.SendEmailAsync(message.RecipientEmail, subject, emailBody.ToString()); 

            // --- 2. LƯU DB (Lưu cho Owner) ---
            var anomalyType = (message.IsElectricAnomaly ? "Điện" : "") + (message.IsWaterAnomaly ? (message.IsElectricAnomaly ? " & Nước" : "Nước") : "");
            var dbMessage = $"Cảnh báo Tiêu thụ Bất thường ({anomalyType}) từ khách hàng ID: {message.TenantId}. Điện: {message.ElectricUsage}, Nước: {message.WaterUsage}.";

            await repository.AddAsync(new Notification
            {
                UserId = message.TenantId, // Hoặc lưu Owner ID, tùy thuộc vào cách bạn muốn hiển thị (thường lưu cho người nhận thông báo - Owner)
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