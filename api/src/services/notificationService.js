class LocalNotificationService {
  async sendOrderConfirmation({ email, orderId }) {
    console.info('Order confirmation queued', { email, orderId });
    return { provider: 'local', status: 'queued' };
  }
}

module.exports = { notificationService: new LocalNotificationService() };
