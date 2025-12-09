using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;

namespace NotificationService.Services
{
    // Kế thừa BackgroundService để chạy ngầm
    public class RabbitMQWorker : BackgroundService
    {
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private IConnection _connection;
        private IModel _channel;
        private readonly string _queueName;

        public RabbitMQWorker(IConfiguration configuration, IEmailService emailService)
        {
            _configuration = configuration;
            _emailService = emailService;
            
            // Lấy tên Queue từ cấu hình
            _queueName = _configuration["RabbitMQ:QueueName"] ?? "notification_queue";
            
            InitializeRabbitMqListener();
        }

        private void InitializeRabbitMqListener()
        {
            try
            {
                var factory = new ConnectionFactory()
                {
                    HostName = _configuration["RabbitMQ:HostName"],
                    Port = int.Parse(_configuration["RabbitMQ:Port"] ?? "5672"),
                    UserName = _configuration["RabbitMQ:UserName"],
                    Password = _configuration["RabbitMQ:Password"]
                };
                
                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();
                
                // Khai báo Queue (Đảm bảo Queue tồn tại)
                _channel.QueueDeclare(queue: _queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
                
                Console.WriteLine($"[RabbitMQ] Listening for messages on queue: {_queueName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RabbitMQ ERROR] Could not connect or initialize: {ex.Message}");
                // Có thể thêm logic thử kết nối lại
            }
        }

        // Phương thức chính của BackgroundService để lắng nghe
        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Kiểm tra kết nối
            if (_channel == null || !_channel.IsOpen)
            {
                Console.WriteLine("[RabbitMQ] Channel is closed. Consumer will not start.");
                return Task.CompletedTask;
            }

            var consumer = new EventingBasicConsumer(_channel);
            
            consumer.Received += async (model, ea) =>
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);
                Console.WriteLine($"[RECEIVED] Message from queue: {message}");

                // ⭐️ GỌI LOGIC XỬ LÝ
                await HandleMessage(message);

                // Gửi xác nhận đã xử lý tin nhắn
                _channel.BasicAck(ea.DeliveryTag, multiple: false);
            };

            // Bắt đầu lắng nghe
            _channel.BasicConsume(queue: _queueName, autoAck: false, consumer: consumer);

            return Task.CompletedTask;
        }

        private async Task HandleMessage(string message)
        {
            // ⭐️ LOGIC XỬ LÝ TIN NHẮN (DESERIALIZATION VÀ GỌI EMAIL SERVICE)
            
            try
            {
                // Giả định tin nhắn là JSON chứa ToEmail, Subject, Body
                // Ở đây, ta dùng hardcode để minh họa
                
                // Giả lập logic xử lý tin nhắn
                string toEmail = "thongthien2004@gmail.com"; // Thường được lấy từ message JSON
                string subject = "Notification: New Invoice Ready!";
                string emailBody = $"<h1>Invoice Notification</h1><p>Invoice details: {message}</p>";
                
                // GỌI EMAIL SERVICE
                await _emailService.SendEmailAsync(toEmail, subject, emailBody);
            }
            catch (Exception ex)
            {
                // Log lỗi trong quá trình xử lý tin nhắn
                Console.WriteLine($"Error processing message: {ex.Message}");
            }
        }

        // Đóng kết nối khi ứng dụng dừng
        public override void Dispose()
        {
            _channel?.Close();
            _connection?.Close();
            base.Dispose();
        }
    }
}