// This is a Vercel Serverless Function to handle messages
// It uses Upstash Redis REST API to store messages

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('Redis environment variables not configured');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const makeRedisCall = async (command, args = []) => {
    try {
      const response = await fetch(`${redisUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([command, ...args])
      });

      if (!response.ok) {
        throw new Error(`Redis error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Redis call error:', error);
      throw error;
    }
  };

  try {
    if (req.method === 'GET') {
      // Get all messages using GET
      try {
        const result = await makeRedisCall('GET', ['wedding_messages']);
        
        if (!result.result) {
          return res.status(200).json([]);
        }

        const messages = JSON.parse(result.result);
        return res.status(200).json(Array.isArray(messages) ? messages : []);
      } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(200).json([]);
      }
    }

    if (req.method === 'POST') {
      const { name, message } = req.body;

      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }

      try {
        // Get existing messages
        let messages = [];
        
        try {
          const result = await makeRedisCall('GET', ['wedding_messages']);
          
          if (result.result) {
            messages = JSON.parse(result.result);
            if (!Array.isArray(messages)) {
              messages = [];
            }
          }
        } catch (e) {
          console.error('Error getting messages:', e);
          messages = [];
        }

        // Create new message
        const newMessage = {
          id: Date.now(),
          name: name,
          message: message,
          timestamp: new Date().toISOString()
        };

        messages.push(newMessage);

        // Save to Redis
        const setResult = await makeRedisCall('SET', ['wedding_messages', JSON.stringify(messages)]);
        
        console.log('SET result:', setResult);

        return res.status(200).json({ success: true, message: newMessage });
      } catch (error) {
        console.error('Error in POST:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
      }
    }

    if (req.method === 'DELETE') {
      const { id, password } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      if (!password || password !== 'pikachu') {
        return res.status(401).json({ error: 'Invalid password' });
      }

      try {
        // Get existing messages
        let messages = [];
        
        const result = await makeRedisCall('GET', ['wedding_messages']);
        
        if (result.result) {
          messages = JSON.parse(result.result);
          if (!Array.isArray(messages)) {
            messages = [];
          }
        }

        // Filter out the message
        const filteredMessages = messages.filter(msg => msg.id !== id);

        // Save back to Redis
        await makeRedisCall('SET', ['wedding_messages', JSON.stringify(filteredMessages)]);

        return res.status(200).json({ success: true, message: 'Message deleted' });
      } catch (error) {
        console.error('Error deleting message:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'PUT') {
      const { password } = req.body;

      if (!password || password !== 'pikachu') {
        return res.status(401).json({ error: 'Invalid password' });
      }

      try {
        await makeRedisCall('DEL', ['wedding_messages']);
        return res.status(200).json({ success: true, message: 'All messages cleared' });
      } catch (error) {
        console.error('Error clearing messages:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
