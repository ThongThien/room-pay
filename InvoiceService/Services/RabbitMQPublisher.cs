// // Services/RabbitMQPublisher.cs
// using RabbitMQ.Client;
// using System.Text;
// using System.Text.Json;
// using Microsoft.Extensions.Configuration;

// public class RabbitMQPublisher : IRabbitMQPublisher
// {
//     private readonly ConnectionFactory _factory;
//     private readonly IConfiguration _configuration;
//     private const string ExchangeName = "finance_exchange";

//     public RabbitMQPublisher(ConnectionFactory factory, IConfiguration configuration)
//     {
//         _factory = factory;
//         _configuration = configuration;
//     }

//     public void PublishInvoiceOverdue(InvoiceOverdueEvent eventData)
//     {
//         // 1. Tạo kết nối và Channel
//         using var connection = _factory.CreateConnection();
//         using var channel = connection.CreateModel();
        
//         // 2. Khai báo Exchange (đảm bảo nó tồn tại)
//         channel.ExchangeDeclare(exchange: ExchangeName, type: ExchangeType.Topic, durable: true);
        
//         // 3. Serialize Event
//         var message = JsonSerializer.Serialize(eventData);
//         var body = Encoding.UTF8.GetBytes(message);
        
//         // 4. Gửi tin nhắn (Publish)
//         // Routing Key: "invoice.overdue" (dùng cho NotificationService lắng nghe)
//         channel.BasicPublish(
//             exchange: ExchangeName,
//             routingKey: "invoice.overdue", 
//             basicProperties: null,
//             body: body);
//     }
// }