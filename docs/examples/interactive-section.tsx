import React from 'react';

import { Bar, Container, Resizer, Section } from '@column-resizer/react';

function onResizing(resizer: Resizer): void {
  if (resizer.isBarActivated(0)) {
    resizer.resizeSection(2, { toSize: resizer.getSectionSize(0) });
  } else {
    resizer.resizeSection(0, { toSize: resizer.getSectionSize(2) });
  }

  if (resizer.getSectionSize(1) < 300) {
    const remainingSize = resizer.getTotalSize() - 300;
    resizer.resizeSection(0, { toSize: remainingSize / 2 });
    resizer.resizeSection(1, { toSize: 300 });
    resizer.resizeSection(2, { toSize: remainingSize / 2 });
  }
}

export const InteractiveSection = () => (
  <section>
    <Container className="h-[50vh] whitespace-nowrap" beforeApplyResizer={onResizing}>
      <Section className="flex items-center justify-center bg-[#80808080]" />
      <Bar size={10} className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize" />
      <Section className="flex items-center justify-center bg-[#80808080]" />
      <Bar size={10} className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize" />
      <Section className="flex items-center justify-center bg-[#80808080]" />
    </Container>
  </section>
);
