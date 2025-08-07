import { MongoClient } from "mongodb";

// Supabase will automatically set the MONGO_URI environment variable
// from the secrets you set in your project settings.
const MONGO_URI = Deno.env.get("MONGO_URI");

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not set in environment variables");
}

const client = new MongoClient(MONGO_URI);
const connection = client.connect().then(() => console.log("Connected to MongoDB")).catch(err => console.error("Failed to connect to MongoDB", err));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await connection;

    const body = await req.json();
    const userId = body.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const db = client.db("db");
    const agents = db.collection("agents");
    
    const agent = await agents.findOne({ created_by: userId });

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found for the given userId" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const calls = db.collection("calls");
    const userTranscripts = await calls.find({ agent_id: agent._id }).toArray();

    return new Response(JSON.stringify(userTranscripts), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});