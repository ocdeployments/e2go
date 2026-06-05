export const SMOKE_ROUTES = [
  { path: '/', expectedStatus: 200, name: 'Landing' },
  { path: '/quiz', expectedStatus: 200, name: 'Quiz' },
  { path: '/pricing', expectedStatus: 200, name: 'Pricing' },
  { path: '/login', expectedStatus: 200, name: 'Login' },
  { path: '/signup', expectedStatus: 200, name: 'Signup' },
  { path: '/about', expectedStatus: 200, name: 'About' },
  { path: '/privacy', expectedStatus: 200, name: 'Privacy' },
  { path: '/terms', expectedStatus: 200, name: 'Terms' },
  { path: '/learn', expectedStatus: 200, name: 'Learn' },
  { path: '/api/health', expectedStatus: 200, name: 'Health' },
  { path: '/dashboard', expectedStatus: 200, name: 'Dashboard (auth check)' },
  { path: '/apply/module3', expectedStatus: 200, name: 'Module3 (auth check)' },
]