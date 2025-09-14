self.addEventListener('install', (event) => {
  console.log('Minimal Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Minimal Service Worker activating.');
});

// Don't intercept fetch requests - no offline capability
