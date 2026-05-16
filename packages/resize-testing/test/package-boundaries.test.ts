import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../../..');

function sourceText(packageName: string): string {
  const sourceDir = join(root, 'packages', packageName, 'src');

  function files(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        return files(path);
      }

      return entry.isFile() && /\.[cm]?[tj]sx?$/.test(entry.name) ? [path] : [];
    });
  }

  return files(sourceDir)
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
}

describe('new resize package boundaries', () => {
  it('keeps resize-kernel free of DOM, browser, CSS, pointer, flexbox, and React APIs', () => {
    const text = sourceText('resize-kernel');

    expect(text).not.toMatch(/\bHTMLElement\b|\bPointerEvent\b|\bMouseEvent\b|\bReact\b/);
    expect(text).not.toMatch(/\bCSS\b|\bstyle\b|\bflex\b|\bdocument\b|\bwindow\b/);
  });

  it('keeps new packages from importing or naming the old bar/section architecture', () => {
    const text = ['resize-kernel', 'resize-graph', 'resize-dom', 'resize-react']
      .map(sourceText)
      .join('\n');

    expect(text).not.toContain("from '@column-resizer/core'");
    expect(text).not.toContain("from '../../core");
    expect(text).not.toMatch(
      /\bBarAction\b|\bBarActionType\b|\bSizeInfo\b|\bSizeRelatedInfo\b|\bItemType\.BAR\b|\bItemType\.SECTION\b|\bflexGrowRatio\b|\bbeforeApplyResizer\b|\bdata-item-type\b|\bbar-store\b/,
    );
  });
});
