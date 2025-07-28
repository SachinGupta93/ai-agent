'use client';

import { useState, useEffect } from 'react';

interface MemoryEntry {
  id: string;
  timestamp: string;
  type: 'conversation' | 'task' | 'system_command' | 'learning';
  input: string;
  output: string;
  metadata?: {
    success?: boolean;
    executionTime?: number;
    commandKey?: string;
    tags?: string[];
  };
}

interface MemoryStats {
  totalEntries: number;
  lastUpdated: string;
  conversationCount: number;
  taskCount: number;
  systemCommandCount: number;
}

export default function MemoryDashboard() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [recentMemories, setRecentMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemoryEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchStats();
      fetchRecentMemories();
    }
  }, [isVisible]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/memory?action=stats');
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching memory stats:', error);
    }
  };

  const fetchRecentMemories = async () => {
    try {
      const response = await fetch('/api/memory?action=recent&limit=5');
      const data = await response.json();
      if (data.status === 'success') {
        setRecentMemories(data.data);
      }
    } catch (error) {
      console.error('Error fetching recent memories:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await fetch(`/api/memory?action=search&query=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();
      if (data.status === 'success') {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Error searching memories:', error);
    }
  };

  const clearMemory = async () => {
    if (!confirm('Are you sure you want to clear all memory? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/memory', { method: 'DELETE' });
      const data = await response.json();
      if (data.status === 'success') {
        alert('Memory cleared successfully');
        fetchStats();
        fetchRecentMemories();
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error clearing memory:', error);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'conversation': return 'bg-blue-100 text-blue-800';
      case 'task': return 'bg-green-100 text-green-800';
      case 'system_command': return 'bg-purple-100 text-purple-800';
      case 'learning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700"
      >
        📊 Memory Dashboard
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">🧠 Memory Dashboard</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalEntries}</div>
              <div className="text-sm text-blue-800">Total Entries</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.conversationCount}</div>
              <div className="text-sm text-green-800">Conversations</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.systemCommandCount}</div>
              <div className="text-sm text-purple-800">System Commands</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.taskCount}</div>
              <div className="text-sm text-yellow-800">Tasks</div>
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Search
            </button>
            <button
              onClick={clearMemory}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Clear All
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Search Results ({searchResults.length})</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {searchResults.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(entry.type)}`}>
                        {entry.type}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-700 mb-1">Input: {entry.input}</div>
                      <div className="text-gray-600">Output: {entry.output}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Memories */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Memories</h3>
          <div className="space-y-3">
            {recentMemories.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(entry.type)}`}>
                    {entry.type}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-700 mb-1">Input: {entry.input}</div>
                  <div className="text-gray-600">Output: {entry.output}</div>
                  {entry.metadata?.executionTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      Execution time: {entry.metadata.executionTime}ms
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}