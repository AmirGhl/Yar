/**
 * خوش‌آمد اولین اجرا: سه چیز که بدون آن‌ها صفحه «مال کس دیگری» است —
 * نام، شهر، و تم. همه اختیاری‌اند و «بعداً» هم همیشه هست.
 *
 * فقط یک بار، روی نصب تازه نشان داده می‌شود (کلید yar:onboarded).
 */

import { el, icon } from '../core/dom.js';
import { MESSAGE, send } from '../core/messaging.js';
import { readData, writeData, updateSettings } from '../core/storage.js';
import { openDialog } from './dialog.js';
import { toast } from './toast.js';

const ONBOARDED_KEY = 'yar:onboarded';

/** آیا باید خوش‌آمد را نشان داد؟ فقط اگر نه پرچم هست و نه هیچ تنظیم ذخیره‌شده‌ای. */
export async function needsOnboarding() {
  if (await readData(ONBOARDED_KEY, false)) return false;
  const stored = await readData('yar:settings', null);
  if (stored) {
    // کاربر قبلی که پیش از این نسخه نصب کرده بود: پرچم را بی‌صدا می‌زنیم
    await writeData(ONBOARDED_KEY, true);
    return false;
  }
  return true;
}

/**
 * @param {{settings:object, onDone:(settings:object)=>void}} options
 */
export function openOnboarding({ settings, onDone }) {
  let city = null;
  let theme = settings.appearance.theme;

  const name = el('input', {
    class: 'input',
    type: 'text',
    maxlength: '30',
    placeholder: 'مثلاً: سارا',
    'aria-label': 'نام شما',
    autofocus: true,
  });

  // --- شهر ---
  const cityInput = el('input', { class: 'input', type: 'search', placeholder: 'نام شهر… (تهران، اصفهان، مشهد…)', 'aria-label': 'شهر' });
  const cityResults = el('div', { class: 'onboarding__chips' });
  const cityChosen = el('p', { class: 'field__hint', text: `فعلاً: ${settings.weather.city.name}` });
  let debounce = null;
  cityInput.addEventListener('input', () => {
    clearTimeout(debounce);
    const query = cityInput.value;
    debounce = setTimeout(async () => {
      if (query.trim().length < 2) {
        cityResults.replaceChildren();
        return;
      }
      try {
        const { data = [] } = await send(MESSAGE.geocode, { query });
        cityResults.replaceChildren(
          ...data.slice(0, 5).map((item) =>
            el('button', {
              class: 'chip',
              type: 'button',
              text: `${item.name}${item.admin ? `، ${item.admin}` : ''}`,
              on: {
                click: () => {
                  city = { name: item.name, latitude: item.latitude, longitude: item.longitude, timeZone: item.timeZone, country: item.country };
                  cityChosen.textContent = `انتخاب شد: ${item.name}`;
                  cityResults.replaceChildren();
                  cityInput.value = '';
                },
              },
            }),
          ),
        );
        if (!data.length) cityResults.replaceChildren(el('span', { class: 'field__hint', text: 'شهری با این نام پیدا نشد.' }));
      } catch (error) {
        cityResults.replaceChildren(el('span', { class: 'field__hint', text: error.message }));
      }
    }, 350);
  });

  // --- تم ---
  const themes = [
    ['dark', 'تیره', 'moon'],
    ['light', 'روشن', 'sun'],
    ['auto', 'هماهنگ با سیستم', 'settings'],
  ];
  const themeButtons = themes.map(([id, label, iconName]) =>
    el('button', {
      class: 'chip',
      type: 'button',
      'aria-pressed': String(theme === id),
      on: {
        click: (event) => {
          theme = id;
          themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button === event.currentTarget)));
          document.documentElement.dataset.theme = id === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : id;
        },
      },
    }, [icon(iconName, { size: 14 }), label]),
  );

  let finished = false;

  async function finish(save) {
    finished = true;
    await writeData(ONBOARDED_KEY, true);
    if (save) {
      const patch = { appearance: { theme }, general: { userName: name.value.trim() } };
      if (city) patch.weather = { city };
      const next = await updateSettings(patch);
      dialog.close();
      onDone(next);
      toast('یار آماده است — Ctrl+K را امتحان کنید');
      return;
    }
    dialog.close();
    onDone(null);
  }

  const content = el('div', { class: 'onboarding' }, [
    el('p', { class: 'onboarding__lead', text: 'تب جدید فارسی شما — تقویم، آب‌وهوا، نرخ‌ها، کارها و یادداشت‌ها، همه روی همین دستگاه.' }),
    el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'نام شما (برای سلام)' }), name]),
    el('div', { class: 'field' }, [el('span', { class: 'field__label', text: 'شهر (برای آب‌وهوا)' }), cityInput, cityResults, cityChosen]),
    el('div', { class: 'field' }, [el('span', { class: 'field__label', text: 'تم' }), el('div', { class: 'onboarding__chips' }, themeButtons)]),
    el('ul', { class: 'onboarding__tips' }, [
      el('li', {}, [el('kbd', { text: 'Ctrl+K' }), ' همه‌چیز از یک جا: فرمان، سایت، حساب، تبدیل']),
      el('li', {}, [el('kbd', { text: 'yar' }), ' + فاصله در نوار آدرس کروم: «yar ۱۰۰ دلار» یا «yar کار خرید نان»']),
      el('li', {}, [el('kbd', { text: 'راست‌کلیک' }), ' روی هر متن یا پیوند: افزودن به کارها، یادداشت یا میان‌برها']),
    ]),
    el('div', { class: 'prompt__actions' }, [
      el('button', { class: 'btn btn--primary', type: 'button', text: 'شروع', on: { click: () => finish(true) } }),
      el('button', { class: 'btn btn--ghost', type: 'button', text: 'بعداً', on: { click: () => finish(false) } }),
    ]),
  ]);

  const dialog = openDialog({
    title: 'به یار خوش آمدید',
    iconName: 'sparkle',
    content,
    className: 'dialog--onboarding',
    // بستن با Esc یا کلیک بیرون یعنی «بعداً» — دوباره سراغ کاربر نمی‌آییم
    onClose: () => {
      writeData(ONBOARDED_KEY, true);
      if (!finished) onDone(null); // پیش‌نمایش تم برگردانده شود
    },
  });
  return dialog;
}
