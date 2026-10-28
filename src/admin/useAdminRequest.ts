import { useEffect, useRef, useState } from 'react';
import { adminError } from './adminApi';
export function useAdminRequest<T>(load: () => Promise<T>, key: string, revision: number) {
  const ref = useRef(load);
  ref.current = load;
  const [state, set] = useState<{ data: T | null; loading: boolean; error: string }>({
    data: null,
    loading: true,
    error: '',
  });
  useEffect(() => {
    let live = true;
    set({ data: null, loading: true, error: '' });
    void ref.current().then(
      (data) => {
        if (live) set({ data, loading: false, error: '' });
      },
      (error) => {
        if (live) set({ data: null, loading: false, error: adminError(error) });
      },
    );
    return () => {
      live = false;
    };
  }, [key, revision]);
  return state;
}
