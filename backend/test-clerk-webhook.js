const axios = require('axios');

// Test Clerk webhook integration
const testClerkWebhook = async () => {
  console.log('🧪 Testing Clerk webhook integration...');
  
  // Sample Clerk webhook payload for user.created event
  const clerkWebhookPayload = {
    type: 'user.created',
    data: {
      id: 'user_2abc123def456',
      first_name: 'Alice',
      last_name: 'Johnson',
      email_addresses: [
        {
          email_address: 'alice.johnson@techcorp.com',
          verification: {
            status: 'verified'
          }
        }
      ],
      phone_numbers: [
        {
          phone_number: '+1555987654'
        }
      ],
      created_at: Date.now(),
      updated_at: Date.now()
    }
  };
  
  try {
    const response = await axios.post('http://localhost:3001/api/clerk-webhooks', clerkWebhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Clerk webhook test successful!');
    console.log('📊 Response:', response.data);
    console.log('\n🎯 Integration Instructions:');
    console.log('1. In your Clerk Dashboard, go to Webhooks');
    console.log('2. Add endpoint: http://your-domain.com/api/clerk-webhooks');
    console.log('3. Subscribe to "user.created" events');
    console.log('4. Users who sign up via Clerk will automatically appear in your CRM!');
    
  } catch (error) {
    console.error('❌ Clerk webhook test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

// Run the test
testClerkWebhook();