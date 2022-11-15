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
        <h2>Collapsible section demo</h2>
        <Container
          className="container"
          columnResizerRef={this.columnResizerRef}
          beforeApplyResizer={beforeApplyResizer}
        >
          <Section className="section" />
          <Bar size={10} className="bar" onClick={this.onBarClick} />
          <Section className="section" />
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
