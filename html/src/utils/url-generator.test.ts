import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../config-resolver';
import { getStreamUrls } from './url-generator';
import { generateDefaultStreamIds, randomHex } from './uuid';

const ids = { publisher: 'live_abc', player: 'play_def' };

describe('getStreamUrls', () => {
  it('builds SRT, SRTLA, player and stats URLs from the resolved config', () => {
    const cfg = resolveConfig(
      { srtHost: 'ingest.example.com', statsHost: 'https://stats.example.com', srtlaPort: '5000' },
      { protocol: 'http:', hostname: '10.0.0.1', port: '3000', origin: 'http://10.0.0.1:3000' },
    );
    const byLabel = Object.fromEntries(getStreamUrls(ids, cfg).map((u) => [u.label, u.url]));
    expect(byLabel['SRT Publisher']).toBe('srt://ingest.example.com:4001?streamid=live_abc');
    expect(byLabel['SRTLA Publisher']).toBe('srtla://ingest.example.com:5000?streamid=live_abc');
    expect(byLabel['SRT Player']).toBe('srt://ingest.example.com:4000?streamid=play_def');
    expect(byLabel['Statistics']).toBe('https://stats.example.com/stats/play_def');
    expect(byLabel['Statistics (legacy format)']).toBe('https://stats.example.com/stats/play_def?legacy=1');
  });

  it('omits the SRTLA URL when SRTLA_PORT is not set', () => {
    const cfg = resolveConfig({}, { protocol: 'http:', hostname: '10.0.0.1', port: '3000', origin: 'http://10.0.0.1:3000' });
    expect(getStreamUrls(ids, cfg).map((u) => u.label)).not.toContain('SRTLA Publisher');
  });
});

describe('stream ID generation', () => {
  it('produces 128-bit hex IDs with the expected prefixes', () => {
    expect(randomHex()).toMatch(/^[0-9a-f]{32}$/);
    const { publisherId, playerId } = generateDefaultStreamIds();
    expect(publisherId).toMatch(/^live_[0-9a-f]{32}$/);
    expect(playerId).toMatch(/^play_[0-9a-f]{32}$/);
    expect(publisherId.slice(5)).not.toBe(playerId.slice(5));
  });
});
