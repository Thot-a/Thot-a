import { QueryClient } from '@tanstack/react-query';

import { isAppError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        // Don't retry validation/permission errors; retry transient ones twice.
        if (isAppError(error) && !error.retryable) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
