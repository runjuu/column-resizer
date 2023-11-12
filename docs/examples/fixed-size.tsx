import React from 'react';

import * as Resizer from '@column-resizer/react';

export const FixedSize = () => (
  <section>
    <Resizer.Container className="h-[50vh] whitespace-nowrap">
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" size={500}>
        Fixed size.
        <br />
        (default is not responsive)
      </Resizer.Section>
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" />
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section
        className="flex items-center justify-center bg-[#80808080]"
        maxSize={500}
        defaultSize={200}
      >
        max size is 500px.
      </Resizer.Section>
    </Resizer.Container>

    <Resizer.Container className="h-[50vh] whitespace-nowrap">
      <Resizer.Section
        className="flex items-center justify-center bg-[#80808080]"
        size={500}
        disableResponsive={false}
      >
        Fixed size.
        <br />
        (try to resize the browser to see the difference)
      </Resizer.Section>
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section className="flex items-center justify-center bg-[#80808080]" />
      <Resizer.Bar
        size={10}
        className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
      />
      <Resizer.Section
        className="flex items-center justify-center bg-[#80808080]"
        maxSize={500}
        defaultSize={200}
      >
        max size is 500px.
      </Resizer.Section>
    </Resizer.Container>
  </section>
);
