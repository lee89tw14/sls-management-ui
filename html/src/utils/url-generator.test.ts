import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveConfig, type PageLocation } from '../config-resolver';
import { generatePublisherUrl, generateStatsUrl, getStreamUrls } from './url-generator';
import {
  encodeStreamIdForPath,
  encodeStreamIdForQuery,
  generateDefaultStreamIds,
  isValidStreamId,
  randomHex,
} from './stream-id';

const ids = { publisher: 'live_abc', player: 'play_def' };
const lanPage: PageLocation = { protocol: 'http:', hostname: '10.0.0.1', port: '3000', origin: 'http://10.0.0.1:3000' };

describe('getStreamUrls', () => {
  it('builds SRT, SRTLA, player and stats URLs from the resolved config', () => {
    const cfg = resolveConfig(
      { srtHost: 'ingest.example.com', statsHost: 'https://stats.example.com', srtlaPort: '5000' },
      lanPage,
    );
    const byLabel = Object.fromEntries(getStreamUrls(ids, cfg).map((u) => [u.label, u.url]));
    expect(byLabel['SRT Publisher']).toBe('srt://ingest.example.com:4001?streamid=live_abc');
    expect(byLabel['SRTLA Publisher']).toBe('srtla://ingest.example.com:5000?streamid=live_abc');
    expect(byLabel['SRT Player']).toBe('srt://ingest.example.com:4000?streamid=play_def');
    expect(byLabel['Statistics (NOALBS 2.14+)']).toBe('https://stats.example.com/stats/play_def');
    expect(byLabel['Statistics (legacy, NOALBS < 2.14)']).toBe(
      'https://stats.example.com/stats/play_def?legacy=1',
    );
  });

  it('omits the SRTLA URL when SRTLA_PORT is not set', () => {
    const cfg = resolveConfig({}, lanPage);
    expect(getStreamUrls(ids, cfg).map((u) => u.label)).not.toContain('SRTLA Publisher');
  });

  it('matches the old output for the srtla-receiver default APP_URL', () => {
    const cfg = resolveConfig({ appUrl: 'http://203.0.113.7:8080' }, lanPage);
    expect(generateStatsUrl('play_x', cfg, true)).toBe('http://203.0.113.7:8080/stats/play_x?legacy=1');
  });
});

describe('stream IDs inside URLs', () => {
  const cfg = resolveConfig({ srtHost: 'h' }, lanPage);

  it('cannot move the legacy flag into the fragment or add query parameters', () => {
    expect(generateStatsUrl('play?x#frag', cfg, true)).toBe('http://10.0.0.1:8080/stats/play%3Fx%23frag?legacy=1');
    expect(generatePublisherUrl('live_a&latency=1', cfg)).toBe('srt://h:4001?streamid=live_a%26latency%3D1');
  });

  it('keeps "/" readable', () => {
    expect(encodeStreamIdForQuery('live/a b')).toBe('live/a%20b');
    expect(encodeStreamIdForPath('play/a?b')).toBe('play/a%3Fb');
  });

  it('validates new IDs against the allowed character set', () => {
    expect(isValidStreamId('live_0123abcd')).toBe(true);
    expect(isValidStreamId('team/live-1.main~x')).toBe(true);
    expect(isValidStreamId('live a')).toBe(false);
    expect(isValidStreamId('live?x')).toBe(false);
    expect(isValidStreamId('')).toBe(false);
    expect(isValidStreamId('x'.repeat(513))).toBe(false);
  });
});

describe('stream ID generation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('produces 128-bit hex IDs with the expected prefixes', () => {
    expect(randomHex()).toMatch(/^[0-9a-f]{32}$/);
    const { publisherId, playerId } = generateDefaultStreamIds();
    expect(publisherId).toMatch(/^live_[0-9a-f]{32}$/);
    expect(playerId).toMatch(/^play_[0-9a-f]{32}$/);
    expect(publisherId.slice(5)).not.toBe(playerId.slice(5));
  });

  it('takes its randomness from crypto.getRandomValues, not Math.random', () => {
    const csprng = vi.spyOn(crypto, 'getRandomValues');
    const weak = vi.spyOn(Math, 'random');
    generateDefaultStreamIds();
    expect(csprng).toHaveBeenCalledTimes(2);
    expect(weak).not.toHaveBeenCalled();
  });
});
