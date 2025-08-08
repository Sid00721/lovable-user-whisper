import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
  const ITEMS_PER_PAGE = 10;

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
          ...(selectedUser !== 'all' && { userEmail: selectedUser })
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
  }, [selectedUser, currentPage]);

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
                <div className="text-sm text-gray-500">
                  <div>{toSydneyTime(transcript.start_time)}</div>
                </div>
              </CardTitle>
              <div className="text-sm text-gray-600">
                <p><strong>Duration:</strong> {transcript.duration} seconds</p>
                <p><strong>Status:</strong> {transcript.status}</p>
                <p><strong>Summary:</strong> {transcript.call_summary}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcript.timestamps && transcript.timestamps
                  .filter((msg: any) => msg.event_type === 'message')
                  .map((message: any, index: number) => (
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
                        }`}
                      >
                        <div className="text-sm">
                          <strong>
                            {message.message_type === 'human' ? 'Caller' : 'AI Assistant'}
                          </strong>
                        </div>
                        <div>{message.text}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {toSydneyTime(message.timestamp * 1000)}
                        </div>
                      </div>
                    </div>
                  ))}
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