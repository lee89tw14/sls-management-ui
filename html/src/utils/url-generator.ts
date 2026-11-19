import config, { type ResolvedConfig } from '../config';

// Generate SRT Player URL
export const generatePlayerUrl = (playerId: string, cfg: ResolvedConfig = config): string =>
  `srt://${cfg.srtHost}:${cfg.srtPlayerPort}?streamid=${playerId}`;

// Generate SRT Publisher URL
export const generatePublisherUrl = (publisherId: string, cfg: ResolvedConfig = config): string =>
  `srt://${cfg.srtHost}:${cfg.srtSenderPort}?streamid=${publisherId}`;

// Generate SRTLA Publisher URL
export const generateSrtlaPublisherUrl = (publisherId: string, cfg: ResolvedConfig = config): string =>
  `srtla://${cfg.srtHost}:${cfg.srtlaPort}?streamid=${publisherId}`;

// Generate Stats URL
export const generateStatsUrl = (playerId: string, cfg: ResolvedConfig = config): string =>
  `${cfg.statsUrl}/stats/${playerId}?legacy=1`;

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
  if (cfg.srtlaPort !== '') {
    urls.push({
      label: 'SRTLA Publisher',
      url: generateSrtlaPublisherUrl(streamId.publisher, cfg),
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
      label: 'Statistics',
      url: generateStatsUrl(streamId.player, cfg),
      description: 'View real-time statistics for this stream',
      icon: 'bi-graph-up',
    },
  );

  return urls;
};
