using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;
using System; // Cần thiết cho Console.WriteLine và Exception

namespace NotificationService.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        // Constructor
        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // CẬP NHẬT: Thêm tham số isHtml = false
        public async Task SendEmailAsync(string toEmail, string subject, string message, bool isHtml = false)
        {
            var email = new MimeMessage();
            
            // ⭐️ ĐỌC CÁC THÔNG SỐ CẤU HÌNH MAILJET
            var smtpHost = _configuration["SmtpSettings_mailjet:Host"];
            // Cẩn thận khi parse int, nên dùng int.TryParse hoặc kiểm tra null
            var portString = _configuration["SmtpSettings_mailjet:Port"] ?? "587";
            if (!int.TryParse(portString, out var smtpPort))
            {
                smtpPort = 587; // Giá trị mặc định nếu parse lỗi
            }
            
            var senderEmail = _configuration["SmtpSettings_mailjet:SenderEmail"];
            var senderName = _configuration["SmtpSettings_mailjet:SenderName"];
            var smtpUsername = _configuration["SmtpSettings_mailjet:Username"];
            var smtpPassword = _configuration["SmtpSettings_mailjet:Password"];
            
            // Thiết lập thông tin người gửi
            email.From.Add(new MailboxAddress(senderName, senderEmail));
            
            // Thiết lập thông tin người nhận
            email.To.Add(MailboxAddress.Parse(toEmail));

            // Thiết lập Tiêu đề và Nội dung
            email.Subject = subject;
            var builder = new BodyBuilder();

            // ⭐️ ĐOẠN CODE QUAN TRỌNG: Xử lý dựa trên tham số isHtml
            if (isHtml)
            {
                builder.HtmlBody = message; 
            }
            else
            {
                builder.TextBody = message; 
            }
            
            email.Body = builder.ToMessageBody();

            using (var client = new SmtpClient())
            {
                try
                {
                    // Lệnh này yêu cầu MailKit bỏ qua quá trình xác thực chứng chỉ.
                    client.ServerCertificateValidationCallback = (s, c, h, e) => true;
                    
                    // Thường dùng SecureSocketOptions.Auto hoặc StartTls khi cổng là 587.
                    // Nếu dùng cổng 465, nên dùng SslOnConnect.
                    // Ở đây tôi giữ lại SslOnConnect như code gốc của bạn.
                    await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.SslOnConnect); 
                    
                    // ⭐️ XÁC THỰC VỚI MAILJET
                    await client.AuthenticateAsync(smtpUsername, smtpPassword);
                    
                    await client.SendAsync(email);
                    Console.WriteLine($"[EMAIL SENT VIA MAILJET] To: {toEmail}, Subject: {subject}, Type: {(isHtml ? "HTML" : "TEXT")}");
                }
                catch (Exception ex)
                {
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