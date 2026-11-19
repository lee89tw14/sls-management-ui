// Stream IDs double as access secrets: a publisher ID allows publishing and a
// player ID allows playback. They must come from a CSPRNG, never Math.random().
// crypto.getRandomValues() also works on plain-http origins (unlike randomUUID()).
export const randomHex = (bytes = 16): string => {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const generatePublisherId = (): string => `live_${randomHex()}`;

export const generatePlayerId = (): string => `play_${randomHex()}`;

// Generate default stream IDs
export const generateDefaultStreamIds = () => ({
  publisherId: generatePublisherId(),
  playerId: generatePlayerId(),
});
