// Gateway base URL. Empty = same origin: requests go to /api/v1, /recommend, /chatbot ...
// and are proxied to the API gateway (CRA dev proxy in development, nginx in Docker).
export const GATEWAY_URL = (process.env.REACT_APP_GATEWAY_URL || '').replace(/\/$/, '');
export const API_URL = `${GATEWAY_URL}/api/v1`;

export const APP_NAME = 'PTIT Shop';
