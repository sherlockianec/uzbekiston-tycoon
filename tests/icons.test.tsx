import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Icon from '../src/components/icons/Icon';
import { ICON_NAMES } from '../src/components/icons/paths';
import { GROUP_ICON_IDS, ASSET_ICON_IDS, assetIconName, groupIconName, specialIconName } from '../src/components/icons/iconFor';
import { GROUPS, INFRASTRUCTURE, UTILITIES } from '../src/game/data/properties';
import { BOARD } from '../src/game/data/board';

describe('icon set', () => {
  it('every icon renders an svg with no external references', () => {
    for (const name of ICON_NAMES) {
      const html = renderToStaticMarkup(<Icon name={name} />);
      expect(html).toContain('<svg');
      expect(html).not.toMatch(/https?:|href=|<image/);
    }
  });
  it('every property group, transport asset and utility has an icon', () => {
    for (const g of GROUPS) expect(groupIconName(g.id), g.id).not.toBeNull();
    for (const id of [...Object.keys(INFRASTRUCTURE), ...Object.keys(UTILITIES)]) expect(assetIconName(id), id).not.toBeNull();
    expect(GROUP_ICON_IDS.length).toBe(GROUPS.length);
    expect(ASSET_ICON_IDS.length).toBe(Object.keys(INFRASTRUCTURE).length + Object.keys(UTILITIES).length);
  });
  it('every card, tax, corruption and corner cell has an icon', () => {
    const special = BOARD.filter((b) => !['property', 'infrastructure', 'utility'].includes(b.kind));
    for (const b of special) expect(specialIconName(b), b.id).not.toBeNull();
  });
  it('decorative icons are hidden from screen readers; titled ones are labelled', () => {
    expect(renderToStaticMarkup(<Icon name="lock" />)).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<Icon name="lock" title="Locked" />)).toContain('aria-label="Locked"');
  });
});
