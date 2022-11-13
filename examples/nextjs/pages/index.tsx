import React from 'react';

import {
  CollapsibleSection,
  DefaultSize,
  FixedSize,
  InteractiveSection,
  MaxMinSize,
  NestingDemo,
  ResponsiveSize,
  Simple,
} from '../sections';

export default function Home() {
  return (
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
  );
}
