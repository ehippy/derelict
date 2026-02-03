import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { trpc, trpcClient } from '@/lib/api/trpc';
import '@/app/globals.css';

import HomePage from '@/app/page';
import LoginPage from '@/app/login/page';
import FAQPage from '@/app/faq/page';
import GuildPage from '@/app/[guildSlug]/page';

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (same as cache time for persistence)
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: false, // Don't refetch when component remounts
          },
        },
      })
  );

  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: window.localStorage,
      key: 'othership_query_cache',
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }} // 24 hour cache
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/:guildSlug" element={<GuildPage />} />
          </Routes>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
