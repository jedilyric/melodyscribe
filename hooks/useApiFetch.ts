import { useCallback } from 'react';
import { useAuth } from '@/context/auth';

export function useApiFetch() {
  const { getToken } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> ?? {}),
      },
    });
  }, [getToken]);
}
