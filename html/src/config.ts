// Configuration with runtime replacement support and dynamic backend detection

// Environment variables mapping for compile-time access
const ENV_VARS = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    REACT_APP_BASE_URL: process.env.REACT_APP_BASE_URL || '{{BASE_URL}}',
    REACT_APP_SRT_PLAYER_PORT: process.env.REACT_APP_SRT_PLAYER_PORT || '{{SRT_PLAYER_PORT}}',
    REACT_APP_SRT_SENDER_PORT: process.env.REACT_APP_SRT_SENDER_PORT || '{{SRT_SENDER_PORT}}',
    REACT_APP_SLS_STATS_PORT: process.env.REACT_APP_SLS_STATS_PORT || '{{SLS_STATS_PORT}}',
    REACT_APP_SRTLA_PORT: process.env.REACT_APP_SRTLA_PORT || '{{SRTLA_PORT}}',
    REACT_APP_API_PROXY_PATH: process.env.REACT_APP_API_PROXY_PATH || '{{API_PROXY_PATH}}'
};

// Safely access environment variables
const getEnvVar = (key: keyof typeof ENV_VARS, fallback: string = '') => {
    return ENV_VARS[key] || fallback;
};

const config = (() => {
    // Helper function to detect if current access is via IP or FQDN
    const getCurrentHostInfo = () => {
        const hostname = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;
        
        // Check if hostname is an IP address (IPv4)
        const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
        
        return {
            hostname,
            port,
            protocol,
            isIP,
            isLocalhost: hostname === 'localhost' || hostname === '127.0.0.1'
        };
    };

    // Get dynamic API endpoint based on access method
    const getDynamicApiEndpoint = () => {
        const hostInfo = getCurrentHostInfo();
        
        // In development, use environment variable if available
        if (getEnvVar('NODE_ENV') === 'development') {
            return getEnvVar('REACT_APP_BASE_URL', 'http://localhost:8080');
        }
        
        // Check for explicitly configured base URL first
        const configuredUrl = getEnvVar('REACT_APP_BASE_URL', '{{BASE_URL}}');
        if (configuredUrl && !configuredUrl.includes('{{')) {
            return configuredUrl;
        }
        
        // Dynamic endpoint generation based on access method
        if (hostInfo.isIP || hostInfo.isLocalhost) {
            // Direct IP/localhost access: use same host with stats port
            const statsPort = getEnvVar('REACT_APP_SLS_STATS_PORT', '{{SLS_STATS_PORT}}') || '8080';
            const resolvedStatsPort = statsPort.includes('{{') ? '8080' : statsPort;
            return `${hostInfo.protocol}//${hostInfo.hostname}:${resolvedStatsPort}`;
        } else {
            // FQDN access: assume nginx proxy setup
            // Check if there's a configured proxy path or use default
            const proxyPath = getEnvVar('REACT_APP_API_PROXY_PATH', '{{API_PROXY_PATH}}');
            
            if (proxyPath && !proxyPath.includes('{{')) {
                // Use configured proxy path
                return `${hostInfo.protocol}//${hostInfo.hostname}${hostInfo.port ? `:${hostInfo.port}` : ''}${proxyPath}`;
            } else {
                // Default: assume API is proxied under /api or same origin with different port
                // For nginx proxy, typically you'd proxy /api/* to backend:8080
                // If no proxy path is specified, assume direct proxy to backend
                return `${hostInfo.protocol}//${hostInfo.hostname}${hostInfo.port ? `:${hostInfo.port}` : ''}`;
            }
        }
    };
    
    // SRT/SRTLA ports configuration
    const SRT_PLAYER_PORT = getEnvVar('REACT_APP_SRT_PLAYER_PORT', '{{SRT_PLAYER_PORT}}');
    const SRT_SENDER_PORT = getEnvVar('REACT_APP_SRT_SENDER_PORT', '{{SRT_SENDER_PORT}}');
    const SLS_STATS_PORT = getEnvVar('REACT_APP_SLS_STATS_PORT', '{{SLS_STATS_PORT}}');
    // SRTLA_PORT is optional - will be empty if not configured
    const SRTLA_PORT = getEnvVar('REACT_APP_SRTLA_PORT', '{{SRTLA_PORT}}');

    return {
        apiEndpoint: getDynamicApiEndpoint(),
        srtPlayerPort: SRT_PLAYER_PORT,
        srtSenderPort: SRT_SENDER_PORT,
        slsStatsPort: SLS_STATS_PORT,
        srtlaPort: SRTLA_PORT,
        // Add helper methods for debugging
        getHostInfo: getCurrentHostInfo,
        getDynamicEndpoint: getDynamicApiEndpoint
    };
})();

export default config; 