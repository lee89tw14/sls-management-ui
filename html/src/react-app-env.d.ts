/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_BASE_URL?: string;
    REACT_APP_SRT_PLAYER_PORT?: string;
    REACT_APP_SRT_SENDER_PORT?: string;
    REACT_APP_SLS_STATS_PORT?: string;
    REACT_APP_SRTLA_PORT?: string;
  }
}
