import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import OpenAI from 'openai';

// Helper function to convert UTC time to Sydney time
const toSydneyTime = (utcTime: string | number) => {
  const date = new Date(utcTime);
  return date.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const UserAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [recordings, setRecordings] = useState<{[key: string]: any[]}>({});
  const [loadingRecordings, setLoadingRecordings] = useState<{[key: string]: boolean}>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement | null}>({});
  const ITEMS_PER_PAGE = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [aiInsights, setAiInsights] = useState<{[key: string]: {summary: string; takeaways: string[]; sentiment: string}}>({});
  const [loadingInsights, setLoadingInsights] = useState<{[key: string]: boolean}>({});
  const [activeTranscript, setActiveTranscript] = useState<string | null>(null);
  const [activeMessageIndex, setActiveMessageIndex] = useState<number>(-1);

  // Function to fetch recordings for a specific call
  const fetchRecordings = async (transcript: any) => {
    const callId = transcript._id;
    if (recordings[callId] || loadingRecordings[callId]) {
      return; // Already loaded or loading
    }

    setLoadingRecordings(prev => ({ ...prev, [callId]: true }));
    
    try {
      // Log transcript data to see available fields
      console.log('Transcript data:', transcript);
      
      // Try to find a Twilio call SID in the transcript
      // Twilio call SIDs start with 'CA' and are 34 characters long
      let twilioCallSid = null;
      
      // Check common field names that might contain the Twilio call SID
      const possibleFields = ['call_sid', 'twilio_call_sid', 'sid', 'call_id', 'external_id', 'telephony_id'];
      for (const field of possibleFields) {
        if (transcript[field] && typeof transcript[field] === 'string' && transcript[field].startsWith('CA')) {
          twilioCallSid = transcript[field];
          break;
        }
      }
      
      if (!twilioCallSid) {
        console.warn('No Twilio call SID found in transcript:', transcript);
        setRecordings(prev => ({ ...prev, [callId]: [] }));
        return;
      }
      
      console.log('Using Twilio call SID:', twilioCallSid);
      
      const { data, error } = await supabase.functions.invoke('get-call-recordings', {
        body: { call_sid: twilioCallSid }
      });
      
      if (error) {
        console.error('Error fetching recordings:', error);
        return;
      }
      
      setRecordings(prev => ({ ...prev, [callId]: data.recordings || [] }));
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setLoadingRecordings(prev => ({ ...prev, [callId]: false }));
    }
  };

  // Function to handle audio playback
  const handleAudioPlay = (audioUrl: string, recordingSid: string, transcriptId: string) => {
    const audio = audioRefs.current[recordingSid];
    if (!audio) return;

    if (playingAudio === audioUrl) {
      audio.pause();
      setPlayingAudio(null);
      setActiveTranscript(null);
      setActiveMessageIndex(-1);
    } else {
      // Pause all other audios
      Object.values(audioRefs.current).forEach(a => {
        if (a && a !== audio) a.pause();
      });
      audio.play().catch(err => console.error('Playback failed:', err));
      setPlayingAudio(audioUrl);
      setActiveTranscript(transcriptId);
      setActiveMessageIndex(-1);
    }

    audio.ontimeupdate = () => {
      const currentTime = audio.currentTime;
      const currentTranscript = transcripts.find(t => t._id === transcriptId);
      if (!currentTranscript) return;
      const messages = currentTranscript.timestamps.filter((m: any) => m.event_type === 'message').sort((a: any, b: any) => a.timestamp - b.timestamp);
      let activeIndex = -1;
      for (let i = 0; i < messages.length; i++) {
        const start = messages[i].timestamp;
        const end = i < messages.length - 1 ? messages[i + 1].timestamp : Infinity;
        if (currentTime >= start && currentTime < end) {
          activeIndex = i;
          break;
        }
      }
      setActiveMessageIndex(activeIndex);
    };

    audio.onended = () => {
      setPlayingAudio(null);
      setActiveTranscript(null);
      setActiveMessageIndex(-1);
    };
  };

  const generateInsights = async (transcript: any) => {
    const callId = transcript._id;
    if (aiInsights[callId] || loadingInsights[callId]) return;
    setLoadingInsights(prev => ({ ...prev, [callId]: true }));
    try {
      const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_API_KEY, dangerouslyAllowBrowser: true });
      const messages = transcript.timestamps.filter((msg: any) => msg.event_type === 'message').map((msg: any) => msg.text).join('\n');
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: `Generate summary, key takeaways, and sentiment (positive/negative/neutral) for this transcript: ${messages}` }],
      });
      const content = response.choices[0].message.content;
      const [summaryLine, takeawaysLine, sentimentLine] = content.split('\n');
      const summary = summaryLine.replace('Summary: ', '');
      const takeaways = takeawaysLine.replace('Takeaways: ', '').split('; ');
      const sentiment = sentimentLine.replace('Sentiment: ', '');
      setAiInsights(prev => ({ ...prev, [callId]: { summary, takeaways, sentiment } }));
    } catch (err) {
      console.error('Failed to generate insights:', err);
    } finally {
      setLoadingInsights(prev => ({ ...prev, [callId]: false }));
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('email, name')
          .order('name');
        
        if (error) throw error;
        setUsers(data || []);
      } catch (err: any) {
        console.error('Failed to fetch users:', err);
      }
    };

    fetchUsers();
  }, []);

  // Reset to page 1 when user filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUser]);

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const requestBody = {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          ...(selectedUser !== 'all' && { userEmail: selectedUser }),
          search: searchQuery,
          date: dateFilter,
          sentiment: sentimentFilter,
          tag: tagFilter
        };
        console.log('Attempting to fetch transcripts with filter:', requestBody);
        
        const { data, error } = await supabase.functions.invoke('get-all-transcripts', {
          body: requestBody
        });
        console.log('Response from Edge Function:', { data, error });
        if (error) {
          console.error('Edge Function error:', error);
          throw error;
        }
        setTranscripts(data.transcripts || []);
        setTotalPages(data.totalPages || 0);
        setTotalCount(data.totalCount || 0);
        setHasNextPage(data.hasNextPage || false);
        setHasPreviousPage(data.hasPreviousPage || false);
      } catch (err: any) {
        console.error("Failed to fetch transcripts:", err);
        setError(`Failed to send a request to the Edge Function. Check the console for more details. Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, [selectedUser, currentPage, searchQuery, dateFilter, sentimentFilter, tagFilter]);

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">User Analytics</h1>
        <p>Loading transcripts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">User Analytics</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Platform Call Transcripts</h1>
        <div className="w-64">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.email} value={user.email}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search transcripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Date Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="last_week">Last Week</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Sentiment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tags" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            <SelectItem value="sales">Sales Call</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Pagination Info */}
      {totalCount > 0 && (
        <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
          <span>
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} transcripts
          </span>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
      
      <div className="space-y-6">
        {transcripts.map((transcript) => (
          <Card key={transcript._id} className="w-full">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Call from {transcript.from_phone}</span>
                <div className="text-sm text-gray-500 text-right">
                  <div>{toSydneyTime(transcript.start_time)}</div>
                  {(transcript.agent_name || transcript.agent_email) && (
                    <div className="mt-1 text-xs">
                      {transcript.agent_email && (
                        <div className="text-gray-600">
                          <span className="font-medium">Email:</span> {transcript.agent_email}
                        </div>
                      )}
                      {transcript.agent_name && (
                        <div className="text-gray-600 mt-0.5">
                          <span className="font-medium">Agent:</span> {transcript.agent_name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardTitle>
              <div className="text-sm text-gray-600">
                <p><strong>Duration:</strong> {transcript.duration} seconds</p>
                <p><strong>Status:</strong> {transcript.status}</p>
                <p><strong>Summary:</strong> {transcript.call_summary}</p>
                
                {/* Call Recordings Section */}
                <div className="mt-4 border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p><strong>Call Recording:</strong></p>
                    <Button
                      onClick={() => fetchRecordings(transcript)}
                      disabled={loadingRecordings[transcript._id]}
                      variant="outline"
                      size="sm"
                    >
                      {loadingRecordings[transcript._id] ? 'Loading...' : 'Load Recording'}
                    </Button>
                  </div>
                  
                  {recordings[transcript._id] && recordings[transcript._id].length > 0 && (
                    <div className="space-y-2">
                      {recordings[transcript._id].map((recording: any, index: number) => (
                        <div key={recording.sid} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                          <Button
                            onClick={() => handleAudioPlay(recording.media_url, recording.sid, transcript._id)}
                            variant="ghost"
                            size="sm"
                            className="p-1"
                          >
                            {playingAudio === recording.media_url ? <Pause size={16} /> : <Play size={16} />}
                          </Button>
                          
                          <div className="flex-1">
                            <audio
                              ref={(el) => { audioRefs.current[recording.sid] = el; }}
                              src={recording.media_url}
                              controls
                              className="w-full h-8"
                              onPlay={() => setPlayingAudio(recording.media_url)}
                              onPause={() => setPlayingAudio(null)}
                              onEnded={() => setPlayingAudio(null)}
                            />
                          </div>
                          
                          <a
                            href={recording.download_url}
                            download
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Download size={16} />
                          </a>
                          
                          <span className="text-xs text-gray-500">
                            {recording.duration}s
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {recordings[transcript._id] && recordings[transcript._id].length === 0 && (
                    <p className="text-gray-500 text-sm">No recordings found for this call.</p>
                  )}
                </div>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" onClick={() => generateInsights(transcript)} disabled={loadingInsights[transcript._id]} className="mt-4">
                      {loadingInsights[transcript._id] ? 'Generating...' : 'Generate AI Insights'}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {aiInsights[transcript._id] && (
                      <div className="mt-2 p-3 bg-gray-50 rounded">
                        <p><strong>Summary:</strong> {aiInsights[transcript._id].summary}</p>
                        <p><strong>Key Takeaways:</strong></p>
                        <ul>{aiInsights[transcript._id].takeaways.map((t, i) => <li key={i}>- {t}</li>)}</ul>
                        <p><strong>Sentiment:</strong> <Badge variant={aiInsights[transcript._id].sentiment === 'positive' ? 'success' : aiInsights[transcript._id].sentiment === 'negative' ? 'destructive' : 'default'}>{aiInsights[transcript._id].sentiment}</Badge></p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcript.timestamps && transcript.timestamps
                  .filter((msg: any) => msg.event_type === 'message')
                  .map((message: any, index: number) => {
                    const recordingSid = recordings[transcript._id]?.[0]?.sid || '';
                    return (
                      <div
                        key={index}
                        className={`flex ${
                          message.message_type === 'human' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.message_type === 'human'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-800'
                          } ${transcript._id === activeTranscript && index === activeMessageIndex ? 'bg-yellow-100' : ''}`}
                        >
                          <div className="text-sm">
                            <strong>
                              {message.message_type === 'human' ? 'Caller' : 'AI Assistant'}
                            </strong>
                          </div>
                          <div>{message.text}</div>
                          <div
                            className="text-xs opacity-75 mt-1 cursor-pointer"
                            onClick={() => {
                              const audio = audioRefs.current[recordingSid];
                              if (audio && recordingSid) {
                                audio.currentTime = message.timestamp;
                                if (audio.paused) audio.play();
                              }
                            }}
                          >
                            {toSydneyTime(message.timestamp * 1000)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {transcripts.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p>No transcripts found on the platform.</p>
        </div>
      )}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-8">
          <Button 
            onClick={handlePreviousPage} 
            disabled={!hasPreviousPage}
            variant="outline"
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-2">
            {/* Show page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button 
            onClick={handleNextPage} 
            disabled={!hasNextPage}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserAnalytics;