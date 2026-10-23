/** بخش تنظیمات — شهر و آب‌وهوا: جست‌وجوی شهر، موقعیت، کیفیت هوا، واحد دما. */

import { el, icon, clear } from '../../../core/dom.js';
import { group, toggle, selectField } from '../controls.js';
import { MESSAGE, send } from '../../../core/messaging.js';
import { toast } from '../../toast.js';
import { requestPermissions } from '../../../core/permissions.js';
import { AIR_ORIGIN_PATTERN } from '../../../services/air.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function citySection({ settings, patch, render }) {
  function build() {
    const results = el('div', { class: 'search__engines', style: { padding: '0' } });
    const input = el('input', {
      class: 'input',
      type: 'search',
      placeholder: 'نام شهر را بنویسید…',
      'aria-label': 'جست‌وجوی شهر',
    });

    let debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      const query = input.value;
      debounce = setTimeout(async () => {
        if (query.trim().length < 2) {
          clear(results);
          return;
        }
        try {
          const found = await send(MESSAGE.geocode, { query });
          const cities = found.data ?? [];
          if (!cities.length) {
            results.replaceChildren(el('span', { class: 'field__hint', text: 'شهری با این نام پیدا نشد.' }));
            return;
          }
          results.replaceChildren(
            ...cities.map((city) =>
              el('button', {
                class: 'chip',
                type: 'button',
                text: `${city.name}${city.admin ? `، ${city.admin}` : ''} — ${city.country}`,
                on: {
                  click: async () => {
                    const chosen = {
                      name: city.name,
                      latitude: city.latitude,
                      longitude: city.longitude,
                      timeZone: city.timeZone,
                      country: city.country,
                    };
                    await patch({ weather: { city: chosen } }, { rebuildAfter: true });
                    toast(`شهر روی «${city.name}» تنظیم شد`);
                    input.value = '';
                    clear(results);
                  },
                },
              }),
            ),
          );
        } catch (error) {
          results.replaceChildren(el('span', { class: 'field__hint', text: error.message }));
        }
      }, 350);
    });

    const locate = el('button', { class: 'btn btn--ghost', type: 'button' }, [
      icon('location', { size: 16 }),
      'استفاده از موقعیت من',
    ]);
    // مجوز موقعیت دقیقاً وقتی خواسته می‌شود که کاربر روی دکمه بزند، نه هنگام باز شدن صفحه
    locate.addEventListener('click', () => {
      if (!navigator.geolocation) {
        toast('مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند');
        return;
      }
      locate.disabled = true;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const chosen = {
            name: 'موقعیت فعلی',
            latitude: Number(position.coords.latitude.toFixed(4)),
            longitude: Number(position.coords.longitude.toFixed(4)),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            country: '',
          };
          await patch({ weather: { city: chosen, useGeolocation: true } }, { rebuildAfter: true });
          locate.disabled = false;
          toast('موقعیت شما ثبت شد');
        },
        () => {
          locate.disabled = false;
          toast('دسترسی به موقعیت داده نشد. می‌توانید شهر را دستی انتخاب کنید.');
        },
        { timeout: 10000 },
      );
    });

    return group('شهر و آب‌وهوا', [
      el('p', { class: 'field__hint', text: `شهر فعلی: ${settings.weather.city.name}` }),
      input,
      results,
      locate,
      toggle(
        'کیفیت هوا (AQI)',
        settings.weather.airQuality,
        async (value) => {
          // مجوز دامنه دقیقاً با همین کلیک خواسته می‌شود
          if (value && !(await requestPermissions({ origins: [AIR_ORIGIN_PATTERN] }))) {
            toast('بدون اجازهٔ دسترسی، کیفیت هوا گرفته نمی‌شود.');
            render();
            return;
          }
          await patch({ weather: { airQuality: value } }, { rebuildAfter: true });
        },
        'شاخص آلودگی هوا و ذرات PM2.5 در کارت امروز — از Open-Meteo، تخمینی.',
      ),
      selectField(
        'واحد دما',
        [
          { value: 'celsius', label: 'سلسیوس (°C)' },
          { value: 'fahrenheit', label: 'فارنهایت (°F)' },
        ],
        settings.weather.unit,
        (value) => patch({ weather: { unit: value } }, { rebuildAfter: true }),
      ),
    ]);
  }

  return build();
}
