// RS-13 (Gap G-25): GET /api/stripe/checkout is unauthenticated and used to
// return { configured, testMode } — testMode let anyone probe whether this
// deployment is running live or test Stripe keys. This asserts the response
// no longer carries that key, regardless of which key prefix is configured.

describe('GET /api/stripe/checkout', () => {
  const originalSecretKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalSecretKey;
    jest.resetModules();
  });

  async function callGet() {
    const { GET } = await import('../checkout/route');
    const response = await GET();
    return response.json();
  }

  it('does not expose testMode when a test-mode secret key is configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    const body = await callGet();
    expect(body).toEqual({ configured: true });
    expect(body).not.toHaveProperty('testMode');
  });

  it('does not expose testMode when a live secret key is configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc123';
    const body = await callGet();
    expect(body).toEqual({ configured: true });
    expect(body).not.toHaveProperty('testMode');
  });

  it('reports unconfigured with no testMode key when no secret key is set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const body = await callGet();
    expect(body).toEqual({ configured: false });
    expect(body).not.toHaveProperty('testMode');
  });
});
