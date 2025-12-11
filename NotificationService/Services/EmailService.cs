using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace NotificationService.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        // Constructor nhận IConfiguration qua Dependency Injection
        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string message)
        {
            var email = new MimeMessage();
            
            // ⭐️ ĐỌC CÁC THÔNG SỐ CẤU HÌNH MAILJET
            var smtpHost = _configuration["SmtpSettings_mailjet:Host"];
            var smtpPort = int.Parse(_configuration["SmtpSettings_mailjet:Port"] ?? "587");
            var senderEmail = _configuration["SmtpSettings_mailjet:SenderEmail"];
            var senderName = _configuration["SmtpSettings_mailjet:SenderName"];
            var smtpUsername = _configuration["SmtpSettings_mailjet:Username"];
            var smtpPassword = _configuration["SmtpSettings_mailjet:Password"];
            
            // MailKit tự động xử lý STARTTLS khi sử dụng cổng 587
            var enableSsl = bool.Parse(_configuration["SmtpSettings:EnableSsl"] ?? "true"); 

            // Thiết lập thông tin người gửi
            email.From.Add(new MailboxAddress(senderName, senderEmail));
            
            // Thiết lập thông tin người nhận
            email.To.Add(MailboxAddress.Parse(toEmail));

            // Thiết lập Tiêu đề và Nội dung
            email.Subject = subject;
            var builder = new BodyBuilder
            {
                HtmlBody = message 
            };
            email.Body = builder.ToMessageBody();
            using (var client = new SmtpClient())
            {
                try
                {
                    //lệnh này yêu cầu MailKit bỏ qua quá trình xác thực chứng chỉ.
                    client.ServerCertificateValidationCallback = (s, c, h, e) => true;
                    // Kết nối đến Mailjet Host (smtpHost:465)
                    await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.SslOnConnect);
                    // ⭐️ XÁC THỰC VỚI MAILJET bằng API Key và Secret Key
                    await client.AuthenticateAsync(smtpUsername, smtpPassword);
                    
                    await client.SendAsync(email);
                    Console.WriteLine($"[EMAIL SENT VIA MAILJET] To: {toEmail}, Subject: {subject}");
                }
                catch (Exception ex)
                {
                    // Log lỗi nếu không kết nối được Mailjet hoặc xác thực thất bại
                    Console.WriteLine($"[EMAIL ERROR] Failed to send email via Mailjet to {toEmail}: {ex.Message}");
                }
                finally
                {
                    await client.DisconnectAsync(true);
                }
            }
        }
    }
}