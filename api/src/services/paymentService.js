class MockPaymentService {
  async authorize({ orderId, totalCents }) {
    return { provider: 'mock', reference: `mock_${orderId}`, amountCents: totalCents, status: 'authorized' };
  }
}

module.exports = { paymentService: new MockPaymentService() };
