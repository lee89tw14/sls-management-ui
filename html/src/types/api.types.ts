// API response types for SRT Live Server

export interface StreamId {
  publisher: string;
  player: string;
  description?: string;
}

// Per-link statistics reported by srtla_rec (SLS 1.5.2+, SRTLA publishers only)
export interface SrtlaPeerStats {
  connection_id: string;
  bitrate: number;
  throughput: number;
  jitter: number;
  uptime: number;
}

export interface PublisherStats {
  bitrate: number;
  buffer: number;
  dropped_pkts: number;
  latency: number;
  rtt: number;
  uptime: number;
  // SLS 1.5.2+: received network rate incl. retransmissions, in kbps
  throughput?: number;
  peers?: SrtlaPeerStats[];
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface StatsResponse {
  status: string;
  publisher?: PublisherStats;
}

export interface ApiError {
  status: 'error';
  message: string;
} 