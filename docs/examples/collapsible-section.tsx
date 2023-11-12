import React from 'react';

import { Container, Section, Bar, Resizer, ColumnResizer } from '@column-resizer/react';

function beforeApplyResizer(resizer: Resizer): void {
  if (resizer.getSectionSize(0) < 150) {
    resizer.resizeSection(0, { toSize: 0 });
  } else if (resizer.getSectionSize(0) < 300) {
    resizer.resizeSection(0, { toSize: 300 });
  }
}

export class CollapsibleSection extends React.PureComponent {
  readonly columnResizerRef = React.createRef<ColumnResizer>();

  render() {
    return (
      <section>
        <Container
          className="h-[50vh] whitespace-nowrap"
          columnResizerRef={this.columnResizerRef}
          beforeApplyResizer={beforeApplyResizer}
        >
          <Section className="flex items-center justify-center bg-[#80808080]" />
          <Bar
            size={10}
            className="transition bg-[#808080CF] hover:bg-[#808080] cursor-col-resize"
            onClick={this.onBarClick}
          />
          <Section className="flex items-center justify-center bg-[#80808080]" />
        </Container>
      </section>
    );
  }

  private onBarClick = () => {
    const controller = this.columnResizerRef.current;

    if (controller) {
      const resizer = controller.getResizer();

      if (resizer.getSectionSize(0) === 0) {
        resizer.resizeSection(0, { toSize: 300 });
      }

      controller.applyResizer(resizer);
    }
  };
}
