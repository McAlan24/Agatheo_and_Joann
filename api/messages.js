// This is a Vercel Serverless Function to handle messages
// It uses Vercel KV (Redis) to store messages

import { kv } from '@vercel/kv';

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
    if (req.method === 'GET') {
      // Get all messages
      const messages = await kv.get('wedding_messages');
      return res.status(200).json(messages || []);
    }

    if (req.method === 'POST') {
      // Add a new message
      const { name, message } = req.body;

      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }

      // Get existing messages
      const messages = (await kv.get('wedding_messages')) || [];

      // Add new message
      const newMessage = {
        id: Date.now(),
        name: name,
        message: message,
        timestamp: new Date().toISOString()
      };

      messages.push(newMessage);

      // Save back to KV
      await kv.set('wedding_messages', messages);

      return res.status(200).json({ success: true, message: newMessage });
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

      // Get existing messages
      const messages = (await kv.get('wedding_messages')) || [];

      // Filter out the message with the specified ID
      const filteredMessages = messages.filter(msg => msg.id !== id);

      // Save back to KV
      await kv.set('wedding_messages', filteredMessages);

      return res.status(200).json({ success: true, message: 'Message deleted' });
    }

    if (req.method === 'PUT') {
      // Delete all messages (clear everything)
      const { password } = req.body;

      if (!password || password !== 'pikachu') {
        return res.status(401).json({ error: 'Invalid password' });
      }

      await kv.del('wedding_messages');
      return res.status(200).json({ success: true, message: 'All messages cleared' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
