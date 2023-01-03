import { DocsThemeConfig } from 'nextra-theme-docs';
import { useRouter } from 'next/router';

import packageJSON from './package.json';

const config: DocsThemeConfig = {
  logo: <strong>🐙 Column Resizer ({packageJSON.version})</strong>,
  docsRepositoryBase: 'https://github.com/Runjuu/column-resizer/tree/main/packages/docs/pages',
  project: {
    link: 'https://github.com/Runjuu/column-resizer',
  },
  useNextSeoProps() {
    const { route } = useRouter();

    return {
      titleTemplate: route !== '/' ? '%s – Column Resizer' : '%s',
    };
  },
  footer: {
    text() {
      return (
        <div>
          <p>MIT © 2022 Runjuu</p>
        </div>
      );
    },
  },
  sidebar: {
    titleComponent: ({ title, type }) => {
      if (type === 'separator') {
        return <span className="cursor-default">{title}</span>;
      }
      return <>{title}</>;
    },
    defaultMenuCollapseLevel: 0,
  },
};

export default config;
