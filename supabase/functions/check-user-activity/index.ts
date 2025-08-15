import { MongoClient } from "npm:mongodb@6.1.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MONGO_URI = Deno.env.get("MONGO_URI");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not set in environment variables");
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase environment variables are not set");
}

const mongoClient = new MongoClient(MONGO_URI);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('Connected to MongoDB');

    const db = mongoClient.db("db");
    const calls = db.collection("calls");
    const agents = db.collection("agents");

    // Get all users from Supabase
    const { data: users, error: usersError } = await supabase
      .from('clients')
      .select('email, id');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userActivityMap = new Map<string, boolean>();

    // Check activity for each user
    for (const user of users) {
      try {
        // Find agent by user email
        const agent = await agents.findOne({ 
          $or: [
            { created_by: user.email },
            { email: user.email }
          ]
        });

        if (agent) {
          // Check if user has calls in the last 30 days
          const recentCallsCount = await calls.countDocuments({
            agent_id: agent._id,
            start_time: { $gte: thirtyDaysAgo.toISOString() }
          });

          userActivityMap.set(user.email, recentCallsCount > 0);
        } else {
          // No agent found, user is not using platform
          userActivityMap.set(user.email, false);
        }
      } catch (error) {
        console.error(`Error checking activity for user ${user.email}:`, error);
        userActivityMap.set(user.email, false);
      }
    }

    // Update Supabase with the activity status
    const updatePromises = [];
    for (const [email, isActive] of userActivityMap.entries()) {
      updatePromises.push(
        supabase
          .from('clients')
          .update({ is_using_platform: isActive })
          .eq('email', email)
      );
    }

    await Promise.all(updatePromises);

    // Convert Map to object for response
    const activityData = Object.fromEntries(userActivityMap);

    return new Response(JSON.stringify({
      success: true,
      message: `Updated activity status for ${userActivityMap.size} users`,
      activityData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error checking user activity:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } finally {
    await mongoClient.close();
  }
});