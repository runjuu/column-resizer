import { useRouter } from 'next/router';
import { DocsThemeConfig, useConfig } from 'nextra-theme-docs';

import packageJSON from '../package.json';

const config: DocsThemeConfig = {
  logo: <strong>🐙 Column Resizer ({packageJSON.version})</strong>,
  docsRepositoryBase: 'https://github.com/Runjuu/column-resizer/tree/main/packages/docs/pages',
  project: {
    link: 'https://github.com/Runjuu/column-resizer',
  },
  head() {
    const { route } = useRouter();
    const { title } = useConfig();

    return (
      <>
        <title>{route !== '/' ? `${title} – Column Resizer` : title}</title>
      </>
    );
  },
  footer: {
    content() {
      return (
        <div>
          <p>MIT © 2022 Runjuu</p>
        </div>
      );
    },
  },
};

export default config;
