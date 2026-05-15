import type { UserConfig } from 'tsdown';

const defaultEntry = ['src/index.ts'];
const modernTarget = ['chrome91', 'firefox90', 'edge91', 'safari15', 'ios15', 'opera77'];

const packageConfig = {
  entry: defaultEntry,
  format: ['cjs', 'esm'],
  sourcemap: true,
  clean: false,
  dts: true,
  minify: true,
  hash: false,
  outExtensions: ({ format }) => ({
    js: format === 'cjs' ? '.cjs' : '.js',
  }),
} satisfies UserConfig;

type EntryOptions = Pick<UserConfig, 'entry'>;

export function modernConfig(opts?: EntryOptions): UserConfig {
  return {
    ...packageConfig,
    entry: opts?.entry ?? defaultEntry,
    target: modernTarget,
    outDir: 'dist/modern',
  };
}

export function legacyConfig(opts?: EntryOptions): UserConfig {
  return {
    ...packageConfig,
    entry: opts?.entry ?? defaultEntry,
    target: ['es6', 'node16'],
    outDir: 'dist/legacy',
  };
}

export function iifeConfig(
  opts: EntryOptions & {
    deps?: UserConfig['deps'];
    globalName: string;
    globals?: Record<string, string>;
  },
): UserConfig {
  return {
    entry: opts.entry ?? defaultEntry,
    format: 'iife',
    target: modernTarget,
    outDir: 'dist',
    clean: false,
    dts: false,
    minify: true,
    hash: false,
    globalName: opts.globalName,
    deps: opts.deps,
    outputOptions: {
      entryFileNames: '[name].global.js',
      globals: opts.globals,
    },
  };
}
