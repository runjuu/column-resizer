import React from 'react';

import * as Resizer from '@column-resizer/react';

export const DefaultSize = () => (
  <section>
    <Resizer.Container className="h-[50vh] whitespace-nowrap">
      <Resizer.Section
        className="flex items-center justify-center bg-[#80808080]"
        defaultSize={400}
      >
        default is 400px.
      </Resizer.Section>
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" />
    </Resizer.Container>
  </section>
);
