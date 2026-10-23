import React from 'react';
import { AwakenedProvider } from './src/data/repository';
import { AppShell } from './src/app/AppShell';

export default function App() {
  return (
    <AwakenedProvider>
      <AppShell />
    </AwakenedProvider>
  );
}
