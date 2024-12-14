import { Bar, Container, Section } from '@column-resizer/react';

export const App = () => {
  return (
    <Container style={{ height: '100px', background: '#80808080' }}>
      <Section minSize={50} />
      <Bar size={10} style={{ background: 'currentColor', cursor: 'col-resize' }} />
      <Section minSize={100} />
    </Container>
  );
};

export default App;
