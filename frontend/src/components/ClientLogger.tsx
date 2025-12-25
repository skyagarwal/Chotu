'use client';

import { useEffect } from 'react';
import { installClientLogger } from '@/lib/client-logger';

export function ClientLogger() {
  useEffect(() => {
    installClientLogger();
  }, []);

  return null;
}
