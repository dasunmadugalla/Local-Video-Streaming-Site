export const API_BASE = (() => {
  const host = window.location.hostname; 
  const backendPort = 3000;

  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://localhost:${backendPort}`;
  }
  return `http://${host}:${backendPort}`;
})();
