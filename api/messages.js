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

  try {
    if (req.method === 'GET') {
      // Get all messages
      try {
        const response = await fetch(`${redisUrl}/get/wedding_messages`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`
          }
        });
        
        if (!response.ok) {
          console.error('Redis GET failed:', response.status);
          return res.status(200).json([]);
        }

        const data = await response.json();
        
        if (!data.result) {
          return res.status(200).json([]);
        }

        try {
          const messages = JSON.parse(data.result);
          return res.status(200).json(Array.isArray(messages) ? messages : []);
        } catch (e) {
          console.error('Parse error:', e, 'data:', data.result);
          return res.status(200).json([]);
        }
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
          const getResponse = await fetch(`${redisUrl}/get/wedding_messages`, {
            headers: {
              'Authorization': `Bearer ${redisToken}`
            }
          });
          
          if (getResponse.ok) {
            const getData = await getResponse.json();
            if (getData.result) {
              messages = JSON.parse(getData.result);
              if (!Array.isArray(messages)) {
                messages = [];
              }
            }
          }
        } catch (e) {
          console.error('Error getting existing messages:', e);
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

        // Save to Redis using the correct format
        const jsonString = JSON.stringify(messages);
        
        const setResponse = await fetch(`${redisUrl}/set/wedding_messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value: jsonString })
        });

        const setData = await setResponse.json();
        
        if (setData.result === 'OK' || setResponse.ok) {
          console.log('Message saved successfully');
          return res.status(200).json({ success: true, message: newMessage });
        } else {
          console.error('Redis set failed:', setData);
          return res.status(500).json({ error: 'Failed to save message', details: setData });
        }
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
        
        const getResponse = await fetch(`${redisUrl}/get/wedding_messages`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`
          }
        });
        
        if (getResponse.ok) {
          const getData = await getResponse.json();
          if (getData.result) {
            messages = JSON.parse(getData.result);
            if (!Array.isArray(messages)) {
              messages = [];
            }
          }
        }

        // Filter out the message
        const filteredMessages = messages.filter(msg => msg.id !== id);

        // Save back to Redis
        const jsonString = JSON.stringify(filteredMessages);
        
        await fetch(`${redisUrl}/set/wedding_messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value: jsonString })
        });

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
    console.error('Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
