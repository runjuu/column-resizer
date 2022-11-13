import React from 'react';
import { createRoot } from 'react-dom/client';

import {
  Simple,
  DefaultSize,
  ResponsiveSize,
  MaxMinSize,
  FixedSize,
  NestingDemo,
  CollapsibleSection,
  InteractiveSection,
} from './sections';

createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <main>
      <h1>Default Behavior</h1>
      <Simple />
      <DefaultSize />
      <ResponsiveSize />
      <MaxMinSize />
      <FixedSize />
      <NestingDemo />
      <h1>Custom Behavior</h1>
      <CollapsibleSection />
      <InteractiveSection />
    </main>
  </React.StrictMode>,
);
