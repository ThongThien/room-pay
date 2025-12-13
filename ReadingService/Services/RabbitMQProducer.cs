// ReadingService.Services.RabbitMQProducer.cs

using RabbitMQ.Client;
using System.Text.Json;
using System.Text;
using Microsoft.Extensions.Configuration;
using System; // Đảm bảo System được include cho Uri

namespace ReadingService.Services
{
    public class RabbitMQProducer : IMessageProducer
    {
        private readonly IConfiguration _configuration;
        private readonly string _queueName;

        public RabbitMQProducer(IConfiguration configuration)
        {
            _configuration = configuration;
            _queueName = _configuration["RabbitMQ:QueueName"] ?? "notification_queue"; 
        }

        public void SendMessage<T>(T message, string queueName)
        {
            // ⭐️ SỬ DỤNG URI ĐỂ KHỞI TẠO CONNECTION FACTORY
            string host = _configuration["RabbitMQ:HostName"] ?? "localhost";
            string port = _configuration["RabbitMQ:Port"] ?? "5672";
            string user = _configuration["RabbitMQ:UserName"] ?? "guest";
            string pass = _configuration["RabbitMQ:Password"] ?? "guest";

            // Tạo URI AMQP non-SSL
            string uri = $"amqp://{user}:{pass}@{host}:{port}/";

            var factory = new ConnectionFactory()
            {
                Uri = new Uri(uri)
            };
            
            // ⭐️ KHẲNG ĐỊNH: Đặt lại các cấu hình cần thiết, KHÔNG BAO GỒM SSL
            // Đảm bảo không có code nào bật factory.Ssl.Enabled = true;

            try
            {
                // ⭐️ Dùng lại cú pháp chuẩn (Sau khi hạ cấp RabbitMQ):
                using (var connection = factory.CreateConnection())
                using (var channel = connection.CreateModel())
                {
                    // Khai báo Queue
                    channel.QueueDeclare(queue: queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

                    // Chuyển đối tượng C# thành JSON string
                    var jsonString = JsonSerializer.Serialize(message);
                    var body = Encoding.UTF8.GetBytes(jsonString);

                    // Gửi tin nhắn
                    channel.BasicPublish(exchange: "", 
                                         routingKey: queueName,
                                         basicProperties: null,
                                         body: body);
                    
                    Console.WriteLine($"[READING SERVICE PUBLISHED] Type: {typeof(T).Name} to Queue: {queueName}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RABBITMQ ERROR] Failed to send message from ReadingService: {ex.Message}");
                // Trong thực tế, bạn nên có logic Retry/Dead-letter Queue tại đây
            }
        }
    }
}