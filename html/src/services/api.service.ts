import axios, { type AxiosInstance } from 'axios';
import { 
  type StreamId,
  type PublisherStats,
  type HealthStatus,
  type ApiResponse,
  type StatsResponse,
  type ApiError,
} from '../types/api.types';
import config from '../config';
import { encodeStreamIdForPath } from '../utils/stream-id';

export const apiErrorStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export const apiErrorMessage = (error: unknown): string | undefined =>
  axios.isAxiosError<ApiError>(error) ? error.response?.data?.message : undefined;

// API service class for SRT Live Server
export class ApiService {
  private api: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth header if API key is set
    this.api.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers.Authorization = `Bearer ${this.apiKey}`;
      }
      return config;
    });
  }

  // Set API key for authenticated requests
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Health check - no auth required
  async getHealth(): Promise<HealthStatus> {
    const response = await this.api.get<HealthStatus>('/health');
    return response.data;
  }

  // Get all stream IDs
  async getStreamIds(): Promise<StreamId[]> {
    const response = await this.api.get<ApiResponse<StreamId[]>>('/api/stream-ids');
    return response.data.data || [];
  }

  // Add new stream ID
  async addStreamId(streamId: Omit<StreamId, 'description'> & { description?: string }): Promise<void> {
    await this.api.post('/api/stream-ids', streamId);
  }

  // Delete stream ID
  async deleteStreamId(playerId: string): Promise<void> {
    await this.api.delete(`/api/stream-ids/${encodeStreamIdForPath(playerId)}`);
  }

  // Get publisher statistics - no auth required
  async getPublisherStats(playerId: string, reset: boolean = false): Promise<PublisherStats | null> {
    try {
      const response = await this.api.get<StatsResponse>(`/stats/${encodeStreamIdForPath(playerId)}`, {
        params: reset ? { reset: true } : undefined,
      });
      
      // Return the first publisher found (there should only be one per player ID)
      return response.data.publisher ?? null;
    } catch (error) {
      console.error('Error fetching publisher stats:', error);
      return null;
    }
  }
}

// Create a singleton instance
export const apiService = new ApiService(); 