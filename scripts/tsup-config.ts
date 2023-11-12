import type { Options } from 'tsup';

const defaultEntry = ['src/index.ts'];

export function modernConfig(opts?: Pick<Options, 'entry'>): Options {
  return {
    entry: opts?.entry ?? defaultEntry,
    format: ['cjs', 'esm'],
    target: ['chrome91', 'firefox90', 'edge91', 'safari15', 'ios15', 'opera77'],
    outDir: 'dist/modern',
    dts: true,
    sourcemap: true,
    clean: true,
    bundle: true,
    minify: true,
  };
}

export function legacyConfig(opts?: Pick<Options, 'entry'>): Options {
  return {
    entry: opts?.entry ?? defaultEntry,
    format: ['cjs', 'esm'],
    target: ['es6', 'node16'],
    outDir: 'dist/legacy',
    dts: true,
    sourcemap: true,
    clean: true,
    bundle: true,
    minify: true,
  };
}

export function iifeConfig(opts: Pick<Options, 'entry'> & { globalName: string }): Options {
  return {
    entry: opts.entry ?? defaultEntry,
    format: 'iife',
    target: ['chrome91', 'firefox90', 'edge91', 'safari15', 'ios15', 'opera77'],
    outDir: 'dist',
    clean: true,
    bundle: true,
    minify: true,
    globalName: opts.globalName,
  };
}
