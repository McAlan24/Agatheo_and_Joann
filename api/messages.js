// This is a Vercel Serverless Function to handle messages
// It uses Upstash Redis to store messages

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

  try {
    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) {
      console.error('Redis environment variables not configured');
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.method === 'GET') {
      // Get all messages
      try {
        const response = await fetch(`${redisUrl}/get/wedding_messages`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`
          }
        });
        const data = await response.json();
        const messages = data.result ? JSON.parse(data.result) : [];
        return res.status(200).json(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(200).json([]);
      }
    }

    if (req.method === 'POST') {
      // Add a new message
      const { name, message } = req.body;

      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }

      try {
        // Get existing messages
        const getResponse = await fetch(`${redisUrl}/get/wedding_messages`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`
          }
        });
        const getData = await getResponse.json();
        const messages = getData.result ? JSON.parse(getData.result) : [];

        // Add new message
        const newMessage = {
          id: Date.now(),
          name: name,
          message: message,
          timestamp: new Date().toISOString()
        };

        messages.push(newMessage);

        // Save back to Redis
        const setResponse = await fetch(`${redisUrl}/set/wedding_messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(JSON.stringify(messages))
        });

        if (setResponse.ok) {
          return res.status(200).json({ success: true, message: newMessage });
        } else {
          return res.status(500).json({ error: 'Failed to save message' });
        }
      } catch (error) {
        console.error('Error saving message:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'DELETE') {
      // Delete a specific message by ID
      const { id, password } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      if (!password || password !== 'pikachu') {
        return res.status(401).json({ error: 'Invalid password' });
      }

      try {
        // Get existing messages
        const getResponse = await fetch(`${redisUrl}/get/wedding_messages`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`
          }
        });
        const getData = await getResponse.json();
        const messages = getData.result ? JSON.parse(getData.result) : [];

        // Filter out the message with the specified ID
        const filteredMessages = messages.filter(msg => msg.id !== id);

        // Save back to Redis
        await fetch(`${redisUrl}/set/wedding_messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(JSON.stringify(filteredMessages))
        });

        return res.status(200).json({ success: true, message: 'Message deleted' });
      } catch (error) {
        console.error('Error deleting message:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'PUT') {
      // Delete all messages (clear everything)
      const { password } = req.body;

      if (!password || password !== 'pikachu') {
        return res.status(401).json({ error: 'Invalid password' });
      }

      try {
        await fetch(`${redisUrl}/del/wedding_messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${redisToken}`
          }
        });

        return res.status(200).json({ success: true, message: 'All messages cleared' });
      } catch (error) {
        console.error('Error clearing messages:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
