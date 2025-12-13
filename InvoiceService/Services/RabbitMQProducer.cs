// InvoiceService/Messaging/RabbitMQProducer.cs

using RabbitMQ.Client;
using System.Text;

namespace InvoiceService.Services
{
    public class RabbitMQProducer : IMessageProducer, IDisposable
    {
        private readonly IConnection _connection;
        private readonly IModel _channel;
        private readonly IConfiguration _configuration;
        private readonly ILogger<RabbitMQProducer> _logger;
        
        private bool disposedValue;

        public RabbitMQProducer(IConfiguration configuration, ILogger<RabbitMQProducer> logger)
        {
            _configuration = configuration;
            _logger = logger;
            
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
                _logger.LogInformation("RabbitMQ Producer connection established.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not connect to RabbitMQ.");
                // Tùy chọn: ném lỗi hoặc thiết lập logic xử lý khi không kết nối được
                throw; 
            }
        }

        public void SendMessage(string message, string queueName)
        {
            if (_channel == null || !_channel.IsOpen)
            {
                _logger.LogError("RabbitMQ channel is not open. Message cannot be sent.");
                return;
            }

            try
            {
                _channel.QueueDeclare(queue: queueName,
                                      durable: true, // Queue tồn tại sau khi RabbitMQ restart
                                      exclusive: false,
                                      autoDelete: false,
                                      arguments: null);

                var body = Encoding.UTF8.GetBytes(message);

                _channel.BasicPublish(exchange: string.Empty,
                                      routingKey: queueName,
                                      basicProperties: null,
                                      body: body);
                
                _logger.LogDebug("Message sent to queue {QueueName}: {Message}", queueName, message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing message to RabbitMQ queue {QueueName}", queueName);
            }
        }
        
        // Logic IDisposable để dọn dẹp kết nối
        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    _channel?.Dispose();
                    _connection?.Dispose();
                }

                disposedValue = true;
            }
        }

        public void Dispose()
        {
            Dispose(disposing: true);
            GC.SuppressFinalize(this);
        }
    }
}