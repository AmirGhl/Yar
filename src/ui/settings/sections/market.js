/** بخش تنظیمات — بازار: واحد قیمت و انتخاب نمادها. */

import { el } from '../../../core/dom.js';
import { group, selectField } from '../controls.js';
import { MARKET_SYMBOLS } from '../../../core/defaults.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function marketSection({ settings, patch }) {
  const build = () => {
    const groups = {
      currency: 'ارز',
      gold: 'طلا و سکه',
      silver: 'نقره',
      crypto: 'رمزارز',
      global: 'جهانی',
    };

    return group('بازار', [
      selectField(
        'واحد قیمت‌های داخلی',
        [
          { value: 'toman', label: 'تومان' },
          { value: 'rial', label: 'ریال' },
        ],
        settings.market.currencyUnit,
        (value) => patch({ market: { currencyUnit: value } }, { rebuildAfter: true }),
      ),
      ...Object.entries(groups).map(([key, label]) =>
        el('div', { class: 'field' }, [
          el('span', { class: 'field__label', text: label }),
          el(
            'div',
            { class: 'swatches' },
            MARKET_SYMBOLS.filter((symbol) => symbol.group === key).map((symbol) =>
              el('button', {
                class: 'chip',
                type: 'button',
                text: symbol.label,
                'aria-pressed': String(settings.market.symbols.includes(symbol.id)),
                on: {
                  click: async (event) => {
                    const selected = new Set(settings.market.symbols);
                    if (selected.has(symbol.id)) selected.delete(symbol.id);
                    else selected.add(symbol.id);
                    event.currentTarget.setAttribute('aria-pressed', String(selected.has(symbol.id)));
                    await patch({ market: { symbols: [...selected] } }, { rebuildAfter: true });
                  },
                },
              }),
            ),
          ),
        ]),
      ),
    ]);
  };

  return build();
}
