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
    console.log('MongoDB connection successful');

    const body = await req.json();
    console.log('Request body:', body);
    const userEmail = body.userEmail;
    const page = body.page || 1;
    const limit = body.limit || 10;
    const skip = (page - 1) * limit;

    const db = client.db("db");
    const calls = db.collection("calls");
    const agents = db.collection("agents");

    let query: Record<string, unknown> = {};

    // If userEmail is provided, filter by that user's agent
    if (userEmail) {
      // Try to find agent by email first, then by created_by field
      let agent = await agents.findOne({ created_by: userEmail });
      if (!agent) {
        // If not found by email, try finding by other fields
        agent = await agents.findOne({ email: userEmail });
      }
      if (!agent) {
        console.log(`No agent found for userEmail: ${userEmail}`);
        return new Response(JSON.stringify({ 
          transcripts: [], 
          totalCount: 0, 
          currentPage: page, 
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      query = { agent_id: agent._id };
    }

    // Get total count for pagination
    const totalCount = await calls.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Get paginated transcripts enriched with agent info (email/name)
    const transcripts = await calls.aggregate([
      { $match: query },
      { $sort: { start_time: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'agents',
          localField: 'agent_id',
          foreignField: '_id',
          as: 'agent_docs'
        }
      },
      { $unwind: { path: '$agent_docs', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          agent_email: { $ifNull: ['$agent_docs.email', '$agent_docs.created_by'] },
          agent_name: '$agent_docs.name'
        }
      },
      { $project: { agent_docs: 0 } }
    ]).toArray();

    return new Response(JSON.stringify({
      transcripts,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge function error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});