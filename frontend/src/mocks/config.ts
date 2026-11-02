/**
 * Mock orchestration configuration:
 * - VITE_USE_MOCK === 'false': disable mocks and use real backend API.
 * - Otherwise defaults to mock data during local development.
 */
export const isMockEnabled = (): boolean => {
  return import.meta.env.VITE_USE_MOCK !== 'false';
};

/**
 * Optional helper to simulate asynchronous network latency for realistic UX testing
 */
export const mockDelay = (ms = 150): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
