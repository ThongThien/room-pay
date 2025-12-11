namespace InvoiceService.Services
{
    public interface IMessageProducer
    {
        void SendMessage(string message, string queueName);
    }
}