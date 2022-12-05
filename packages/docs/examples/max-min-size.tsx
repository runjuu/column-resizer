import React from 'react';

import * as Resizer from '@column-resizer/react';

export const MaxMinSize = () => (
  <section>
    <Resizer.Container className="h-[50vh] whitespace-nowrap">
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" minSize={150}>
        150px min size.
      </Resizer.Section>
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section
        className="flex items-center justify-center bg-[#80808080]"
        maxSize={600}
        defaultSize={200}
      >
        600px max size.
      </Resizer.Section>
    </Resizer.Container>
  </section>
);
