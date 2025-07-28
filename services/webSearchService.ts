// services/webSearchService.ts
import axios from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp?: string;
}

export interface SearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeImages?: boolean;
  includeNews?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  region?: string;
  language?: string;
}

export class WebSearchService {
  constructor() {}

  private async searchTavily(query: string, maxResults: number = 10): Promise<any[]> {
    if (!process.env.TAVILY_API_KEY) return [];
    
    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_images: false,
        include_raw_content: false
      });
      
      return response.data.results || [];
    } catch (error) {
      console.error('Tavily search error:', error);
      return [];
    }
  }

  private async searchSerpAPI(query: string): Promise<any[]> {
    if (!process.env.SERPAPI_API_KEY) return [];
    
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          api_key: process.env.SERPAPI_API_KEY,
          engine: 'google',
          q: query,
          num: 10
        }
      });
      
      return response.data.organic_results || [];
    } catch (error) {
      console.error('SerpAPI search error:', error);
      return [];
    }
  }

  private async searchDuckDuckGo(query: string): Promise<any[]> {
    // Simple DuckDuckGo search (limited without API)
    try {
      const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
      const results = response.data.RelatedTopics || [];
      
      return results.slice(0, 5).map((item: any) => ({
        title: item.Text?.split(' - ')[0] || 'No title',
        url: item.FirstURL || '',
        snippet: item.Text || 'No description'
      }));
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      return [];
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { maxResults = 10 } = options;

    try {
      // Try Tavily first (best for AI)
      let results = await this.searchTavily(query, maxResults);
      if (results.length > 0) {
        return this.formatTavilyResults(results, maxResults);
      }

      // Try SerpAPI
      results = await this.searchSerpAPI(query);
      if (results.length > 0) {
        return this.formatSerpAPIResults(results, maxResults);
      }

      // Fallback to DuckDuckGo
      results = await this.searchDuckDuckGo(query);
      if (results.length > 0) {
        return this.formatDuckDuckGoResults(results, maxResults);
      }

      throw new Error('No search results found');
    } catch (error: any) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async searchNews(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const newsQuery = `${query} news recent`;
    return this.search(newsQuery, { ...options, includeNews: true });
  }

  async searchCode(query: string, language?: string): Promise<SearchResult[]> {
    const codeQuery = language 
      ? `${query} ${language} code example site:github.com OR site:stackoverflow.com`
      : `${query} code example site:github.com OR site:stackoverflow.com`;
    
    return this.search(codeQuery, { maxResults: 5 });
  }

  async searchDocumentation(query: string, technology?: string): Promise<SearchResult[]> {
    const docQuery = technology
      ? `${query} ${technology} documentation official`
      : `${query} documentation official`;
    
    return this.search(docQuery, { maxResults: 5 });
  }

  private formatTavilyResults(results: any[], maxResults: number): SearchResult[] {
    return results.slice(0, maxResults).map((result: any) => ({
      title: result.title || 'No title',
      url: result.url || '',
      snippet: result.content || result.snippet || 'No description',
      source: 'Tavily',
      timestamp: result.published_date
    }));
  }

  private formatSerpAPIResults(results: any[], maxResults: number): SearchResult[] {
    return results.slice(0, maxResults).map((result: any) => ({
      title: result.title || 'No title',
      url: result.link || '',
      snippet: result.snippet || 'No description',
      source: 'Google'
    }));
  }

  private formatDuckDuckGoResults(results: any[], maxResults: number): SearchResult[] {
    return results.slice(0, maxResults).map((result: any) => ({
      title: result.title || 'No title',
      url: result.url || '',
      snippet: result.snippet || 'No description',
      source: 'DuckDuckGo'
    }));
  }

  async summarizeSearchResults(results: SearchResult[], query: string): Promise<string> {
    if (results.length === 0) {
      return `No search results found for "${query}".`;
    }

    const summaryContent = results.map((result, index) => 
      `${index + 1}. **${result.title}**\n   ${result.snippet}\n   Source: ${result.url}\n`
    ).join('\n');

    return `Search results for "${query}":\n\n${summaryContent}`;
  }

  async getRelevantContext(query: string, maxResults: number = 5): Promise<string> {
    const results = await this.search(query, { maxResults });
    const context = results.map(result => 
      `Title: ${result.title}\nContent: ${result.snippet}\nURL: ${result.url}`
    ).join('\n\n---\n\n');

    return context;
  }
}

export const webSearchService = new WebSearchService();