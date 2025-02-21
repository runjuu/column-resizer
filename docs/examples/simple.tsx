import React from 'react';

import * as Resizer from '@column-resizer/react';

export const Simple = ({ rtl }: { rtl?: boolean }) => (
  <section>
    <Resizer.Container className="h-[50vh] whitespace-nowrap" rtl={rtl}>
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" minSize={100} />
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" minSize={100} />
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" minSize={100} />
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" minSize={100} />
    </Resizer.Container>
  </section>
);
