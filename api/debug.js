// Debug API to check if environment variables are set
export default async function handler(req, res) {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  res.setHeader('Access-Control-Allow-Origin', '*');

  // Check if env vars exist
  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      error: 'Environment variables not set',
      hasUrl: !!redisUrl,
      hasToken: !!redisToken,
      urlPrefix: redisUrl ? redisUrl.substring(0, 20) : 'MISSING'
    });
  }

  // Try to ping Redis
  try {
    const testResponse = await fetch(`${redisUrl}/ping`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`
      }
    });

    const testData = await testResponse.json();

    return res.status(200).json({
      status: 'ok',
      redisStatus: testData,
      envVarsLoaded: true
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to connect to Redis',
      details: error.message
    });
  }
}
