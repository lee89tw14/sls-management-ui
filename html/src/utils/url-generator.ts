import config, { type ResolvedConfig } from '../config';
import { encodeStreamIdForPath, encodeStreamIdForQuery } from './stream-id';

const srtUrl = (scheme: 'srt' | 'srtla', cfg: ResolvedConfig, port: string, id: string): string =>
  `${scheme}://${cfg.srtHost}:${port}?streamid=${encodeStreamIdForQuery(id)}`;

// Generate SRT Player URL
export const generatePlayerUrl = (playerId: string, cfg: ResolvedConfig = config): string =>
  srtUrl('srt', cfg, cfg.srtPlayerPort, playerId);

// Generate SRT Publisher URL
export const generatePublisherUrl = (publisherId: string, cfg: ResolvedConfig = config): string =>
  srtUrl('srt', cfg, cfg.srtSenderPort, publisherId);

// Generate SRTLA Publisher URL
export const generateSrtlaPublisherUrl = (publisherId: string, srtlaPort: string, cfg: ResolvedConfig = config): string =>
  srtUrl('srtla', cfg, srtlaPort, publisherId);

export const generateStatsUrl = (playerId: string, cfg: ResolvedConfig = config, legacy = false): string =>
  `${cfg.statsUrl}/stats/${encodeStreamIdForPath(playerId)}${legacy ? '?legacy=1' : ''}`;

// URL information for display
export interface UrlInfo {
  label: string;
  url: string;
  description: string;
  icon: string;
}

// Get all URLs for a stream
export const getStreamUrls = (
  streamId: { publisher: string; player: string },
  cfg: ResolvedConfig = config,
): UrlInfo[] => {
  const urls: UrlInfo[] = [
    {
      label: 'SRT Publisher',
      url: generatePublisherUrl(streamId.publisher, cfg),
      description: 'Use this URL to publish your stream via SRT',
      icon: 'bi-broadcast',
    },
  ];

  // Only add SRTLA URL if SRTLA port is configured
  if (cfg.srtlaPort !== null) {
    urls.push({
      label: 'SRTLA Publisher',
      url: generateSrtlaPublisherUrl(streamId.publisher, cfg.srtlaPort, cfg),
      description: 'Use this URL to publish your stream via SRTLA (with bonding support)',
      icon: 'bi-broadcast-pin',
    });
  }

  urls.push(
    {
      label: 'SRT Player',
      url: generatePlayerUrl(streamId.player, cfg),
      description: 'Use this URL to play the stream via SRT',
      icon: 'bi-play-circle',
    },
    {
      label: 'Statistics (NOALBS 2.14+)',
      url: generateStatsUrl(streamId.player, cfg),
      description: 'Real-time statistics. In NOALBS 2.14 or later use stream server type "OpenIRL"',
      icon: 'bi-graph-up',
    },
    {
      label: 'Statistics (legacy, NOALBS < 2.14)',
      url: generateStatsUrl(streamId.player, cfg, true),
      description: 'For NOALBS before 2.14 (type "SrtLiveServer"). Deprecated since SLS 1.5.2',
      icon: 'bi-graph-down',
    },
  );

  return urls;
};
