// Resolved runtime configuration for the running page.
// Resolution rules live in config-resolver.ts (pure, unit-tested).
import { resolveConfig, type RawConfig, type ResolvedConfig } from './config-resolver';

export * from './config-resolver';

declare global {
  interface Window {
    __SLS_CONFIG__?: Partial<RawConfig>;
  }
}

const NO_PAGE = { protocol: 'http:', hostname: 'localhost', port: '', origin: 'http://localhost' };

const config: ResolvedConfig =
  typeof window === 'undefined'
    ? resolveConfig({}, NO_PAGE)
    : resolveConfig(window.__SLS_CONFIG__ ?? {}, window.location);

if (typeof window !== 'undefined') {
  config.warnings.forEach((w) => console.warn(`[config] ${w}`));
}

export default config;
