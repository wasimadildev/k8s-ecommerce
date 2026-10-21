class LocalShippingService {
  async createShipment({ orderId }) {
    return { provider: 'local', orderId, status: 'pending' };
  }
}

module.exports = { shippingService: new LocalShippingService() };
