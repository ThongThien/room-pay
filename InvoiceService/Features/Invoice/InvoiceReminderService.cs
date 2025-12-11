// InvoiceService.Services.InvoiceReminderService.cs

using InvoiceService.Models.Enums;
using InvoiceService.Repositories.Interfaces;
using InvoiceService.Services.DTOs;
using InvoiceService.Services;
using InvoiceService.Features.Invoice.DTOs;

using System.Text.Json;

namespace InvoiceService.Features.Invoice
{
    public class InvoiceReminderService : IInvoiceReminderService
    {
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IUserServiceClient _userServiceClient;
        private readonly IMessageProducer _messageProducer;
        private readonly IConfiguration _configuration;
        private readonly ILogger<InvoiceReminderService> _logger;

        public InvoiceReminderService(
            IInvoiceRepository invoiceRepository,
            IUserServiceClient userServiceClient,
            IMessageProducer messageProducer,
            IConfiguration configuration,
            ILogger<InvoiceReminderService> logger)
        {
            _invoiceRepository = invoiceRepository;
            _userServiceClient = userServiceClient;
            _messageProducer = messageProducer;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendPaymentRemindersAsync(string ownerId)
        {
            _logger.LogInformation("--- Starting Payment Reminder Process for Owner {OwnerId} ---", ownerId);
            
            if (string.IsNullOrEmpty(ownerId))
            {
                _logger.LogError("Owner ID is missing.");
                return;
            }

            // 2. Lấy tất cả Tenant ID thuộc Owner này từ AA Service
            _logger.LogInformation("Fetching Tenant Info for Owner {OwnerId}", ownerId);
            var tenantInfos = await _userServiceClient.GetTenantsByOwnerIdAsync(ownerId);

            if (tenantInfos == null || !tenantInfos.Any())
            {
                _logger.LogInformation("No tenants found for Owner {OwnerId}", ownerId);
                return;
            }

            var tenantsToNotify = new List<TenantReminderInfoDTO>();
            
            // 3. Lặp qua từng Tenant và kiểm tra hóa đơn chưa thanh toán
            foreach (var tenantInfo in tenantInfos)
            {
                // Lấy tất cả hóa đơn UNPAID của Tenant
                var unpaidInvoices = await _invoiceRepository.GetUnpaidInvoicesByUserIdAsync(tenantInfo.Id);

                if (unpaidInvoices.Any())
                {
                    // 4. Map dữ liệu vào DTO
                    var reminderDTO = new TenantReminderInfoDTO
                    {
                        TenantInfo = tenantInfo,
                        UnpaidInvoices = unpaidInvoices.Select(inv => new InvoiceReminderDTO
                        {
                            InvoiceId = inv.Id,
                            AmountDue = inv.TotalAmount,
                            DueDate = inv.DueDate
                        }).ToList()
                    };

                    tenantsToNotify.Add(reminderDTO);
                }
            }

            if (tenantsToNotify.Any())
            {
                // 5. Gửi message RabbitMQ
                var message = new InvoiceNotificationMessage
                {
                    Type = "RemindPayment", 
                    TenantsToNotify = tenantsToNotify
                };

                var messageJson = JsonSerializer.Serialize(message);
                
                var queueName = _configuration["RabbitMQ:QueueName"] ?? "notification_queue";

                _messageProducer.SendMessage(messageJson, queueName); 

                _logger.LogInformation("Successfully sent payment reminder message for {Count} tenants to queue {Queue}", 
                    tenantsToNotify.Count, queueName);
            }
            else
            {
                 _logger.LogInformation("No unpaid invoices found for any tenant. No message sent.");
            }
        }
    }
}