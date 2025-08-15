import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Building2, Phone, Mail, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import type { User as CRMUser } from '@/types/crm';

interface SearchResult {
  id: string;
  type: 'user' | 'client';
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: string;
  lastContact?: string;

}

interface SearchBarProps {
  onClose?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onClose, className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const setEditingUser = useAppStore((s) => s.setEditingUser);
  const setShowUserForm = useAppStore((s) => s.setShowUserForm);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        onClose?.();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onClose]);

  // Search function with debouncing
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await performSearch(query.trim());
        setResults(searchResults);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];

    // Search users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, phone')
      .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .limit(5);

    if (!usersError && users) {
      results.push(...users.map(user => ({
        id: user.id,
        type: 'user' as const,
        name: user.full_name || user.email,
        email: user.email,
        phone: user.phone,

      })));
    }

    // Search clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, company, phone, subscription_status, last_contact')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .limit(5);

    if (!clientsError && clients) {
      results.push(...clients.map(client => ({
        id: client.id,
        type: 'client' as const,
        name: client.name,
        email: client.email,
        company: client.company,
        phone: client.phone,
        status: client.subscription_status,
        lastContact: client.last_contact
      })));
    }

    return results.slice(0, 8); // Limit total results
  };

  const hydrateAndOpenEdit = async (result: SearchResult) => {
    // For both user and client, try to create a CRMUser-like object
    try {
      if (result.type === 'user') {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone')
          .eq('id', result.id)
          .single();
        if (error || !data) throw error || new Error('User not found');
        const user: CRMUser = {
          id: data.id,
          name: data.full_name || result.name,
          email: data.email,
          phone: data.phone || '',
          priority: 'normal',
          usingPlatform: false,
          createdAt: new Date().toISOString()
        };
        setEditingUser(user);
        setShowUserForm(true);
      } else {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, email, phone, company, subscription_status, subscription_product, subscription_plan, last_payment_date, last_contact')
          .eq('id', result.id)
          .single();
        if (error || !data) throw error || new Error('Client not found');
        const user: CRMUser = {
          id: data.id,
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || undefined,
          priority: 'normal',
          usingPlatform: false,
          createdAt: new Date().toISOString(),
          subscriptionStatus: data.subscription_status || undefined,
          subscriptionProduct: data.subscription_product || undefined,
          subscriptionPlan: data.subscription_plan || undefined,
          lastPaymentDate: data.last_payment_date || undefined,
          lastContact: data.last_contact || undefined
        };
        setEditingUser(user);
        setShowUserForm(true);
      }
    } catch (e) {
      console.error('Failed to open edit form from search result', e);
      // Fallback to home
      navigate('/');
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Open edit dialog populated with record
    hydrateAndOpenEdit(result);
    setIsOpen(false);
    onClose?.();
  };

  const getResultIcon = (result: SearchResult) => {
    return result.type === 'user' ? User : Building2;
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'trial':
        return 'secondary';
      case 'expired':
      case 'payment_failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search users, clients... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 bg-white/60 dark:bg-gray-900/50 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.24)] ring-1 ring-gray-200/60 dark:ring-gray-700/60">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div ref={resultsRef} className="max-h-80 overflow-y-auto">
                {results.map((result, index) => {
                  const Icon = getResultIcon(result);
                  return (
                    <div
                      key={`${result.type}-${result.id}`}
                      className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-white/40 dark:hover:bg-gray-800/40 transition-colors ${
                        index === selectedIndex ? 'bg-white/50 dark:bg-gray-800/50' : ''
                      }`}
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur flex items-center justify-center ring-1 ring-gray-200/60 dark:ring-gray-700/60">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{result.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {result.type}
                            </Badge>
                            {result.status && (
                              <Badge variant={getStatusBadgeVariant(result.status)} className="text-xs">
                                {result.status}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            {result.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{result.email}</span>
                              </div>
                            )}
                            {result.company && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">{result.company}</span>
                              </div>
                            )}
                            {result.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{result.phone}</span>
                              </div>
                            )}
                            {result.lastContact && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Last contact: {new Date(result.lastContact).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;