const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text()); // For Google Chat webhooks that might send plain text

// In-memory storage (in production, use a real database)
let users = [];
let affiliates = [];

// Load initial data
const loadData = async () => {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const data = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(data);
    users = parsed.users || [];
    affiliates = parsed.affiliates || [];
  } catch (error) {
    console.log('No existing data file, starting fresh');
  }
};

// Save data
const saveData = async () => {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    await fs.writeFile(dataPath, JSON.stringify({ users, affiliates }, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

// Helper function to determine priority based on email domain
const determinePriority = (email, company) => {
  const enterpriseDomains = ['realestate.com', 'propertyexperts.com', 'luxuryrealty.com', 'vpigroup.com.au'];
  const domain = email.split('@')[1];
  
  if (enterpriseDomains.includes(domain) || (company && company.toLowerCase().includes('realty'))) {
    return 'high';
  }
  return 'normal';
};

// Helper function to extract company from email
const extractCompanyFromEmail = (email) => {
  const domain = email.split('@')[1];
  if (domain === 'gmail.com' || domain === 'yahoo.com' || domain === 'hotmail.com') {
    return '';
  }
  return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
};

// Helper function to assign team member
const assignTeamMember = () => {
  const teamMembers = ['Sarah', 'Alex', 'Mike', 'Emma'];
  return teamMembers[Math.floor(Math.random() * teamMembers.length)];
};

// Routes

// Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Get all affiliates
app.get('/api/affiliates', (req, res) => {
  res.json(affiliates);
});

// Add new user
app.post('/api/users', async (req, res) => {
  const userData = req.body;
  const newUser = {
    id: Date.now().toString(),
    name: userData.name || '',
    email: userData.email || '',
    phone: userData.phone || '',
    company: userData.company || extractCompanyFromEmail(userData.email || ''),
    priority: userData.priority || determinePriority(userData.email || '', userData.company || ''),
    usingPlatform: userData.usingPlatform || false,
    assignedTo: userData.assignedTo || assignTeamMember(),
    referredBy: userData.referredBy || '',
    lastContact: userData.lastContact || '',
    notes: userData.notes || '',
    commissionApproved: userData.commissionApproved || false,
    createdAt: new Date().toISOString()
  };
  
  users.unshift(newUser);
  await saveData();
  res.json(newUser);
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const userData = req.body;
  
  const userIndex = users.findIndex(user => user.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users[userIndex] = { ...users[userIndex], ...userData };
  await saveData();
  res.json(users[userIndex]);
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users.splice(userIndex, 1);
  await saveData();
  res.json({ message: 'User deleted successfully' });
});

// Clerk webhook endpoint
app.post('/api/clerk-webhooks', async (req, res) => {
  try {
    console.log('📨 Received Clerk webhook:', req.body);
    
    const { type, data: clerkData } = req.body;
    
    if (type === 'user.created') {
      // Create user object for CRM from Clerk data
      const newUser = {
        id: clerkData.id,
        name: `${clerkData.first_name || ''} ${clerkData.last_name || ''}`.trim() || 'Unknown User',
        email: clerkData.email_addresses[0]?.email_address || '',
        phone: clerkData.phone_numbers[0]?.phone_number || '',
        company: extractCompanyFromEmail(clerkData.email_addresses[0]?.email_address || ''),
        priority: determinePriority(clerkData.email_addresses[0]?.email_address || '', ''),
        usingPlatform: true,
        assignedTo: assignTeamMember(),
        referredBy: '',
        lastContact: new Date().toISOString().split('T')[0],
        notes: 'New signup via Clerk',
        commissionApproved: false,
        createdAt: new Date(clerkData.created_at).toISOString()
      };
      
      users.unshift(newUser);
      await saveData();
      
      console.log('✅ User added to CRM from Clerk:', newUser.name);
      
      res.json({ 
        success: true, 
        message: 'User added to CRM successfully',
        user: newUser 
      });
    } else {
      console.log('ℹ️ Ignoring webhook type:', type);
      res.json({ success: true, message: 'Webhook received but not processed' });
    }
    
  } catch (error) {
    console.error('❌ Error processing Clerk webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// MAIN WEBHOOK ENDPOINT - This mimics your Google Chat webhook endpoint
// Your production app can send the same webhook data here instead of Google Chat
app.post('/v1/spaces/AAAAksZS9Qw/messages', async (req, res) => {
  try {
    console.log('Received Google Chat webhook (production format):', req.body);
    
    // Handle the exact format from your Python notify_user_creation function
    const webhookData = req.body;
    
    // Parse the text field that contains the formatted message
    let userData = {};
    
    if (webhookData.text) {
      // Extract data from the formatted text message
      const text = webhookData.text;
      
      const usernameMatch = text.match(/Username: ([^\n]+)/);
      const firstNameMatch = text.match(/First Name: ([^\n]+)/);
      const lastNameMatch = text.match(/Last Name: ([^\n]+)/);
      const phoneMatch = text.match(/Phone Number: ([^\n]+)/);
      const createdAtMatch = text.match(/Created At: ([^\n]+)/);
      
      userData = {
        username: usernameMatch ? usernameMatch[1].trim() : '',
        first_name: firstNameMatch ? firstNameMatch[1].trim() : '',
        last_name: lastNameMatch ? lastNameMatch[1].trim() : '',
        phone_number: phoneMatch ? phoneMatch[1].trim() : '',
        created_at: createdAtMatch ? createdAtMatch[1].trim() : new Date().toISOString()
      };
    } else {
      // Fallback: assume direct user data format
      userData = webhookData;
    }
    
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email = userData.username || userData.email || '';
    const phone = userData.phone_number || userData.phone || '';
    const createdAt = userData.created_at || new Date().toISOString();
    
    // Create new user from webhook data
    const newUser = {
      id: Date.now().toString(),
      name: fullName,
      email: email,
      phone: phone,
      company: extractCompanyFromEmail(email),
      priority: determinePriority(email, ''),
      usingPlatform: false,
      assignedTo: assignTeamMember(),
      referredBy: '',
      lastContact: '',
      notes: `Auto-added from Google Chat webhook on ${new Date().toLocaleDateString()}`,
      commissionApproved: false,
      createdAt: new Date().toISOString()
    };
    
    users.unshift(newUser);
    await saveData();
    
    console.log('New user added from Google Chat webhook:', newUser);
    
    // Return Google Chat API compatible response
    res.status(200).json({ 
      name: `spaces/AAAAksZS9Qw/messages/${Date.now()}`,
      sender: { name: 'CRM System' },
      text: 'User successfully added to CRM',
      createTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Google Chat webhook error:', error);
    res.status(500).json({ 
      error: {
        code: 500,
        message: 'Failed to process webhook',
        status: 'INTERNAL_ERROR'
      }
    });
  }
});

// Alternative endpoint for direct production webhook (if you want to change the URL)
app.post('/webhook/production-signup', async (req, res) => {
  // Redirect to the Google Chat compatible endpoint
  return app._router.handle({ ...req, url: '/v1/spaces/AAAAksZS9Qw/messages' }, res);
});

// Alternative endpoint for Google Chat webhook format (if needed)
app.post('/webhook/google-chat', async (req, res) => {
  try {
    console.log('Received Google Chat webhook:', req.body);
    
    // Handle both JSON and text formats
    let message = '';
    if (typeof req.body === 'string') {
      message = req.body;
    } else {
      message = req.body.message || req.body.text || JSON.stringify(req.body);
    }
    
    // Extract user data from the Google Chat message format
    const userMatch = message.match(/Username: ([^\n\r]+)/);
    const firstNameMatch = message.match(/First Name: ([^\n\r]+)/);
    const lastNameMatch = message.match(/Last Name: ([^\n\r]+)/);
    const phoneMatch = message.match(/Phone Number: ([^\n\r]+)/);
    const createdAtMatch = message.match(/Created At: ([^\n\r]+)/);
    
    if (!userMatch) {
      console.log('Could not parse message:', message);
      return res.status(400).json({ error: 'Invalid message format' });
    }
    
    const email = userMatch[1].trim();
    const firstName = firstNameMatch ? firstNameMatch[1].trim() : '';
    const lastName = lastNameMatch ? lastNameMatch[1].trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();
    const phone = phoneMatch ? phoneMatch[1].trim() : '';
    const createdAt = createdAtMatch ? createdAtMatch[1].trim() : new Date().toISOString();
    
    const newUser = {
      id: Date.now().toString(),
      name: fullName,
      email: email,
      phone: phone,
      company: extractCompanyFromEmail(email),
      priority: determinePriority(email, ''),
      usingPlatform: false,
      assignedTo: assignTeamMember(),
      referredBy: '',
      lastContact: '',
      notes: `Auto-added from Google Chat webhook on ${new Date().toLocaleDateString()}`,
      commissionApproved: false,
      createdAt: new Date().toISOString()
    };
    
    users.unshift(newUser);
    await saveData();
    
    console.log('New user added from Google Chat:', newUser);
    
    res.status(200).json({ 
      success: true, 
      message: 'User added successfully from Google Chat',
      user: newUser 
    });
    
  } catch (error) {
    console.error('Google Chat webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process Google Chat webhook' 
    });
  }
});

// Simulation endpoint for testing
app.post('/webhook/simulate', async (req, res) => {
  try {
    // Simulate the exact format from your production notifications
    const sampleUsers = [
      {
        username: 'yao.c@vpigroup.com.au',
        first_name: 'Yao',
        last_name: 'Chen',
        phone_number: '+61481858864',
        created_at: '2025-07-22 03:21:02.099000'
      },
      {
        username: 'vaughan.david@gmail.com',
        first_name: 'David',
        last_name: 'Vaughan',
        phone_number: '+61484494400',
        created_at: '2025-07-22 04:01:58.477000'
      }
    ];
    
    const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
    
    // Process the simulated webhook
    const firstName = randomUser.first_name;
    const lastName = randomUser.last_name;
    const fullName = `${firstName} ${lastName}`;
    const email = randomUser.username;
    const phone = randomUser.phone_number;
    const createdAt = randomUser.created_at;
    
    const newUser = {
      id: Date.now().toString(),
      name: fullName,
      email: email,
      phone: phone,
      company: extractCompanyFromEmail(email),
      priority: determinePriority(email, ''),
      usingPlatform: false,
      assignedTo: assignTeamMember(),
      referredBy: '',
      lastContact: '',
      notes: `Simulated webhook user added on ${new Date().toLocaleDateString()}`,
      commissionApproved: false,
      createdAt: new Date().toISOString()
    };
    
    users.unshift(newUser);
    await saveData();
    
    console.log('Simulated user added:', newUser);
    
    res.status(200).json({ 
      success: true, 
      message: 'Simulated user added successfully',
      user: newUser 
    });
    
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to simulate webhook' 
    });
  }
});

// Affiliate routes
app.post('/api/affiliates', async (req, res) => {
  const affiliateData = req.body;
  const newAffiliate = {
    id: Date.now().toString(),
    ...affiliateData,
    createdAt: new Date().toISOString()
  };
  
  affiliates.push(newAffiliate);
  await saveData();
  res.json(newAffiliate);
});

app.put('/api/affiliates/:id', async (req, res) => {
  const affiliateId = req.params.id;
  const affiliateData = req.body;
  
  const affiliateIndex = affiliates.findIndex(affiliate => affiliate.id === affiliateId);
  if (affiliateIndex === -1) {
    return res.status(404).json({ error: 'Affiliate not found' });
  }
  
  affiliates[affiliateIndex] = { ...affiliates[affiliateIndex], ...affiliateData };
  await saveData();
  res.json(affiliates[affiliateIndex]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Voqo CRM Backend server running on port ${PORT}`);
    console.log(`📡 Production webhook endpoint: http://localhost:${PORT}/webhook/production-signup`);
    console.log(`💬 Google Chat webhook endpoint: http://localhost:${PORT}/webhook/google-chat`);
    console.log(`🧪 Simulation endpoint: http://localhost:${PORT}/webhook/simulate`);
    console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
  });
});

module.exports = app;