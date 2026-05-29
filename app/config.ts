const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Smart client-side detection to use localhost when running locally
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return 'http://localhost:5000';
    }
  }
  
  return 'https://spin-wheel-nextjs.onrender.com';
};

export const API_BASE_URL = getBackendUrl();
export const SOCKET_URL = getBackendUrl();
