import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Brain, FileText, LineChart, Search, Sparkles, Loader2, Copy, CheckCircle, Save, History, Trash2, ChevronDown, ChevronRight, Home, Building, User, Users, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import OpenAI from "openai";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// API key from environment variables
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Master system prompt for Voqo AI
const VOQO_SYSTEM_PROMPT = `You are an expert Voqo AI prompt engineer.

Your task is to take a natural language description of a business and their phone answering needs, and generate a complete, production-ready system prompt for a Voqo AI phone-answering agent.

The user will describe their business in plain English. You need to:
1. Extract the key business information from their description
2. Create appropriate roles and duties based on their needs
3. Generate a complete Voqo AI system prompt following the framework below

The output must:
- Follow the Voqo AI Effective Prompt Framework exactly
- Insert the business's details into all relevant sections
- Adapt "Roles" and "Information to Collect" based on the business's requirements
- Preserve all style guardrails, response guidelines, edge cases, and call flow logic
- Be written so it can be pasted directly into Voqo AI as the agent's system prompt
- Contain **no placeholders** — every field must be filled with appropriate data

---

### **Voqo AI Effective Prompt Framework**

## Identity
You are an advanced AI phone answering agent developed by [BUSINESS_NAME] in [LOCATION]. Your purpose is to handle inbound calls for [BUSINESS_TYPE], following the caller's context and the business's requirements.

Your roles include:
[ROLES_AND_DUTIES]

## Style Guardrails
- Be concise, one topic per reply.
- Use natural, conversational tone.
- Vary phrasing; avoid repetition.
- Be proactive; lead with clear next steps.
- Avoid multiple questions in a single turn.
- Ask for clarification if needed.
- Use colloquial date references (e.g., "Friday, 14th of January, 2024 at 8am").

## Response Guideline
- DO NOT use exclamation marks.
- Guess intent when transcripts are imperfect (don't mention "transcription error").
- Stay in character for the current role.
- Keep replies under 25 words.

## Information to Collect
For this business, collect: [DATA_FIELDS]

## Edge Cases
- If asked about the agent: "The team at [BUSINESS_NAME] developed my capabilities. If you'd like, I will let them know you wanted to know more."
- If request is irrelevant to identities: ask them to select an identity.
- If asked how [BUSINESS_NAME] works: "[BUSINESS_NAME] builds real-time conversational AI for phone calls. Our AI agents can handle complex enquiries and respond with a custom knowledge base. We serve individuals and businesses."
- If asked about [BUSINESS_NAME]'s product: "We serve both individuals and businesses. Busy professionals use [BUSINESS_NAME] for Professionals to help them answer missed calls. Businesses use us to handle inbound enquiries. Customer service agents use us to focus on what they do best."
- If asked for private info: refuse and explain privacy policy.


## Task
Follow this multi-step call flow:
1. Greet, state role, and ask for caller's name.
2. Confirm role to proceed (suggest one if unclear).
3. Ask role-specific questions; collect required info.
4. Provide role-specific details (menus, appointments, property info, etc.).
5. Offer handoff with two date/time options if needed.
6. Confirm all actions taken.
7. Offer related help.
8. Offer to switch role if conversation continues.
9. Close politely with "Bye bye".

Always keep track of steps to resume if interrupted.

---

### Output rules:
- Output only the final **system prompt** with all placeholders filled in with real data
- Do not output commentary, analysis, or instructions
- Make sure every [PLACEHOLDER] is replaced with actual business information`;

interface SavedPrompt {
  id: string;
  name: string;
  business_description: string;
  generated_prompt: string;
  created_at: string;
  updated_at: string;
}

export default function Cowboy() {
  const [businessDescription, setBusinessDescription] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [promptName, setPromptName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const { toast: showToast } = useToast();

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  // Load saved prompts on component mount
  useEffect(() => {
    loadSavedPrompts();
  }, []);

  const loadSavedPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading prompts:', error);
        showToast({
          title: "Error loading prompts",
          description: "Failed to load saved prompts",
          variant: "destructive"
        });
        return;
      }

      setSavedPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const generatePrompt = async () => {
    if (!businessDescription.trim()) {
      showToast({
        title: "Business description required",
        description: "Please describe your business first",
        variant: "destructive"
      });
      return;
    }

    if (!OPENAI_API_KEY) {
      showToast({
        title: "OpenAI API key missing",
        description: "Please set your VITE_OPENAI_API_KEY environment variable",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: VOQO_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: businessDescription
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const prompt = completion.choices[0]?.message?.content || "";
      setGeneratedPrompt(prompt);
      
      showToast({
        title: "Prompt generated successfully!",
        description: "Your Voqo AI system prompt is ready"
      });
    } catch (error) {
      console.error('Error generating prompt:', error);
      showToast({
        title: "Error generating prompt",
        description: "Failed to generate prompt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const savePrompt = async () => {
    if (!promptName.trim()) {
      showToast({
        title: "Name required",
        description: "Please enter a name for this prompt",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          name: promptName,
          business_description: businessDescription,
          generated_prompt: generatedPrompt
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving prompt:', error);
        showToast({
          title: "Error saving prompt",
          description: "Failed to save prompt",
          variant: "destructive"
        });
        return;
      }

      setSavedPrompts(prev => [data, ...prev]);
      setPromptName("");
      setShowSaveDialog(false);
      
      showToast({
        title: "Prompt saved!",
        description: "Your prompt has been saved successfully"
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting prompt:', error);
        showToast({
          title: "Error deleting prompt",
          description: "Failed to delete prompt",
          variant: "destructive"
        });
        return;
      }

      setSavedPrompts(prev => prev.filter(p => p.id !== id));
      
      showToast({
        title: "Prompt deleted",
        description: "Prompt has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  const loadPrompt = (prompt: SavedPrompt) => {
    setBusinessDescription(prompt.business_description);
    setGeneratedPrompt(prompt.generated_prompt);
    
    showToast({
      title: "Prompt loaded",
      description: `Loaded "${prompt.name}"`
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        title: "Copied to clipboard!",
        description: "The prompt has been copied to your clipboard"
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showToast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const togglePromptExpansion = (id: string) => {
    setExpandedPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={() => {}} showAnalyticsButton={true} />
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="space-y-1 mb-6">
            <h1 className="text-3xl font-semibold">
              Voqo AI Prompt Generator
            </h1>
            <p className="text-muted-foreground">
              Generate professional system prompts for Voqo AI agents in seconds
            </p>
          </div>
        </div>

        {/* Quick Start Templates */}
        <Card className="mb-8 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Quick Start Templates</CardTitle>
            <p className="text-sm text-muted-foreground">Choose a template to get started quickly</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto p-4 flex-col shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                onClick={() => setBusinessDescription("Real estate agent handling property inquiries and scheduling viewings")}
              >
                <Home className="h-5 w-5 text-primary" />
                <span className="text-sm">Real Estate</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto p-4 flex-col shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                onClick={() => setBusinessDescription("Property management company handling tenant requests and maintenance scheduling")}
              >
                <Building className="h-5 w-5 text-primary" />
                <span className="text-sm">Property Manager</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto p-4 flex-col shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                onClick={() => setBusinessDescription("Buyer's agent helping clients find and purchase properties")}
              >
                <User className="h-5 w-5 text-primary" />
                <span className="text-sm">Buyers Agent</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto p-4 flex-col shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                onClick={() => setBusinessDescription("Real estate agency coordinating multiple agents and client services")}
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm">Agency</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto p-4 flex-col shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                onClick={() => setBusinessDescription("Construction company handling project inquiries and scheduling consultations")}
              >
                <Wrench className="h-5 w-5 text-primary" />
                <span className="text-sm">Construction</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card className="mb-8 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Business Description
            </CardTitle>
            <p className="text-sm text-muted-foreground">Describe your business and what you need the AI agent to handle</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="e.g., Real estate agent handling property inquiries, scheduling viewings, and qualifying leads..."
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={generatePrompt}
                  disabled={!businessDescription.trim() || isGenerating}
                  className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Prompt
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generated Prompt Section */}
        {generatedPrompt && (
          <Card className="mb-8 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Generated System Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={generatedPrompt}
                readOnly
                className="min-h-[300px] resize-none font-mono text-sm"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(generatedPrompt)}
                  variant="outline"
                  className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Prompt
                </Button>
                
                <Button
                  onClick={() => setShowSaveDialog(true)}
                  variant="outline"
                  className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Prompts Section */}
        <Card className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Saved Prompts ({savedPrompts.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">Your previously generated and saved prompts</p>
          </CardHeader>
          <CardContent>
            {savedPrompts.length > 0 ? (
              <div className="space-y-4">
                {savedPrompts.map((prompt) => (
                  <Card key={prompt.id} className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{prompt.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {new Date(prompt.created_at).toLocaleDateString()}
                          </Badge>
                          <Button
                            onClick={() => loadPrompt(prompt)}
                            size="sm"
                            variant="outline"
                            className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deletePrompt(prompt.id)}
                            size="sm"
                            variant="outline"
                            className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Collapsible>
                        <CollapsibleTrigger
                          onClick={() => togglePromptExpansion(prompt.id)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expandedPrompts.has(prompt.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          View Details
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Business Description:</h4>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                              {prompt.business_description}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Generated Prompt:</h4>
                            <div className="bg-muted p-3 rounded-md">
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                {prompt.generated_prompt.substring(0, 200)}...
                              </pre>
                              <Button
                                onClick={() => copyToClipboard(prompt.generated_prompt)}
                                size="sm"
                                variant="ghost"
                                className="mt-2"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy Full Prompt
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No saved prompts yet</p>
                <p className="text-sm">Generate and save your first prompt to see it here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Prompt Name</label>
                <Input
                  placeholder="Enter a name for this prompt..."
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={savePrompt}
                  disabled={!promptName.trim()}
                >
                  Save Prompt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}