/**
 * تقویم ماهانهٔ شمسی با مناسبت‌ها، رویدادهای شخصی و انتخاب روز.
 *
 * زیر جدول، روز انتخاب‌شده در سه تقویم دیده می‌شود، همراه با مناسبت‌ها،
 * یادداشت‌های شخصی همان روز، و فاصله تا تعطیلی رسمی بعدی.
 */

import { el, icon } from '../core/dom.js';
import { createCard, iconButton } from '../ui/card.js';
import {
  toJalali,
  fromJalali,
  jalaliMonthLength,
  jalaliKey,
  persianWeekday,
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  JALALI_WEEKDAYS,
} from '../lib/jalali.js';
import { getOccasions, upcomingHolidays } from '../lib/holidays.js';
import { describeDate, daysBetween, relativeDays } from '../lib/calendars.js';
import { toFaDigits } from '../lib/format.js';
import { readData, writeData, onDataChanged, STORAGE_KEYS } from '../core/storage.js';
import { promptDialog } from '../ui/prompt.js';
import { toast } from '../ui/toast.js';

const MAX_EVENT_LENGTH = 120;

export function createCalendar({ settings }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));

  let today = toJalali(new Date());
  let view = { jy: today.jy, jm: today.jm };
  let selected = { ...today };
  /** @type {Record<string, Array<{id:string, text:string}>>} */
  let personal = {};

  const monthLabel = el('span', { class: 'calendar__month' });
  const grid = el('div', { class: 'calendar__grid', role: 'grid' });
  const detail = el('div', { class: 'calendar__detail', 'aria-live': 'polite' });
  const upcoming = el('p', { class: 'calendar__upcoming' });

  const goTo = (delta) => {
    let { jy, jm } = view;
    jm += delta;
    if (jm > 12) {
      jm = 1;
      jy += 1;
    } else if (jm < 1) {
      jm = 12;
      jy -= 1;
    }
    view = { jy, jm };
    render();
  };

  const backToToday = () => {
    today = toJalali(new Date());
    view = { jy: today.jy, jm: today.jm };
    selected = { ...today };
    render();
  };

  const { element, body } = createCard({
    title: 'تقویم',
    iconName: 'calendar',
    actions: [
      iconButton('plus', 'افزودن یادداشت برای روز انتخاب‌شده', () => addPersonal()),
      iconButton('dot', 'رفتن به امروز', backToToday),
    ],
  });

  const header = el('div', { class: 'calendar__head' }, [
    // در راست‌چین، «ماه قبل» سمت راست و «ماه بعد» سمت چپ می‌نشیند
    iconButton('chevronRight', 'ماه قبل', () => goTo(-1)),
    el('button', { class: 'calendar__month-btn', type: 'button', title: 'بازگشت به امروز', on: { click: backToToday } }, [monthLabel]),
    iconButton('chevronLeft', 'ماه بعد', () => goTo(1)),
  ]);
  body.append(header, grid, detail, upcoming);

  // چرخ موس روی جدول، ماه را عوض می‌کند — با آستانه تا اسکرول لمسی پیوسته ده ماه نپرد
  let wheelAccumulator = 0;
  let wheelReset = null;
  grid.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    // اگر ستون کناری خودش اسکرول دارد، چرخ مال اسکرول است، نه ماه
    if (element.closest('.is-scrollable')) return;
    event.preventDefault();
    wheelAccumulator += event.deltaY;
    clearTimeout(wheelReset);
    wheelReset = setTimeout(() => (wheelAccumulator = 0), 220);
    if (Math.abs(wheelAccumulator) >= 60) {
      goTo(wheelAccumulator > 0 ? 1 : -1);
      wheelAccumulator = 0;
    }
  }, { passive: false });

  // پیمایش روزها با کلید جهت‌دار (راست‌چین: چپ یعنی روز بعد)
  grid.addEventListener('keydown', (event) => {
    const steps = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 7, ArrowUp: -7 };
    const step = steps[event.key];
    if (step == null) return;
    event.preventDefault();
    const date = fromJalali(selected.jy, selected.jm, selected.jd);
    date.setDate(date.getDate() + step);
    selected = toJalali(date);
    view = { jy: selected.jy, jm: selected.jm };
    render();
    grid.querySelector('[data-selected="true"]')?.focus();
  });

  const keyOf = (jalali) => jalaliKey(jalali.jy, jalali.jm, jalali.jd);

  function describeDay(jalali) {
    const date = fromJalali(jalali.jy, jalali.jm, jalali.jd);
    const weekday = persianWeekday(date);
    const { events, isHoliday } = getOccasions(jalali, date, { weekday });
    return { date, weekday, events, isHoliday, mine: personal[keyOf(jalali)] ?? [] };
  }

  async function savePersonal() {
    // روزهای خالی پاک می‌شوند تا ذخیره‌سازی با گذر زمان باد نکند
    personal = Object.fromEntries(Object.entries(personal).filter(([, list]) => list.length));
    await writeData(STORAGE_KEYS.events, personal);
  }

  async function addPersonal() {
    const target = { ...selected };
    const values = await promptDialog({
      title: `یادداشت برای ${digits(target.jd)} ${JALALI_MONTHS[target.jm - 1]}`,
      submitLabel: 'ذخیره',
      fields: [{ name: 'text', label: 'چه خبر است؟', placeholder: 'مثلاً: تولد مادر، جلسهٔ ساعت ۱۰', required: true }],
      validate: (input) => (input.text.length > MAX_EVENT_LENGTH ? 'متن کوتاه‌تری بنویسید.' : null),
    });
    if (!values) return;
    const key = keyOf(target);
    personal[key] = [...(personal[key] ?? []), { id: crypto.randomUUID(), text: values.text }];
    await savePersonal();
    render();
    toast('یادداشت روز ذخیره شد');
  }

  async function removePersonal(key, id) {
    const list = personal[key] ?? [];
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [removed] = list.splice(index, 1);
    personal[key] = list;
    await savePersonal();
    render();
    toast('یادداشت حذف شد', {
      actionLabel: 'برگرداندن',
      onAction: async () => {
        personal[key] = [...(personal[key] ?? [])];
        personal[key].splice(index, 0, removed);
        await savePersonal();
        render();
      },
    });
  }

  function renderDetail() {
    const { date, weekday, events, isHoliday, mine } = describeDay(selected);
    const info = describeDate(date, { persianDigits });
    const distance = daysBetween(new Date(), date);
    const key = keyOf(selected);

    detail.replaceChildren(
      el('div', { class: 'calendar__selected' }, [
        el('b', { text: `${JALALI_WEEKDAYS[weekday]} ${digits(selected.jd)} ${JALALI_MONTHS[selected.jm - 1]}` }),
        isHoliday && el('span', { class: 'calendar__holiday-tag', text: 'تعطیل' }),
        distance !== 0 && el('span', { class: 'calendar__relative', text: relativeDays(distance, { persianDigits }) }),
      ]),
      el('div', { class: 'calendar__alt tnum' }, [
        el('span', { text: info.gregorian }),
        info.hijri && el('span', { title: 'تقریبی — ممکن است یک روز با تقویم رسمی فرق کند', text: info.hijri }),
      ]),
      ...events.map((event) =>
        el('div', { class: 'calendar__event', 'data-holiday': String(event.holiday), text: event.title }),
      ),
      ...mine.map((item) =>
        el('div', { class: 'calendar__mine' }, [
          icon('note', { size: 12 }),
          el('span', { 'data-sensitive': '', text: item.text }),
          el('button', {
            class: 'calendar__mine-remove',
            type: 'button',
            'aria-label': `حذف «${item.text}»`,
            title: 'حذف',
            on: { click: () => removePersonal(key, item.id) },
          }, [icon('close', { size: 11 })]),
        ]),
      ),
    );
  }

  function renderUpcoming() {
    const [next] = upcomingHolidays(new Date(), toJalali, { days: 200, limit: 1 });
    if (!next) {
      upcoming.hidden = true;
      return;
    }
    upcoming.hidden = false;
    const when = next.inDays === 0 ? 'امروز تعطیل است' : `${relativeDays(next.inDays, { persianDigits })} تعطیل است`;
    const span = next.span > 1 ? ` (${digits(next.span)} روز)` : '';
    upcoming.replaceChildren(icon('sparkle', { size: 12 }), el('span', { text: `${when}: ${next.title}${span}` }));
    upcoming.title = describeDate(next.date, { persianDigits }).jalali;
  }

  function render() {
    monthLabel.textContent = `${JALALI_MONTHS[view.jm - 1]} ${digits(view.jy)}`;

    const first = fromJalali(view.jy, view.jm, 1);
    const leading = persianWeekday(first);
    const length = jalaliMonthLength(view.jy, view.jm);

    const cells = JALALI_WEEKDAYS_SHORT.map((label, index) =>
      el('div', {
        class: 'calendar__weekday',
        role: 'columnheader',
        text: label,
        title: JALALI_WEEKDAYS[index],
        style: index === 6 ? { color: 'var(--holiday)' } : {},
      }),
    );

    for (let i = 0; i < leading; i += 1) {
      cells.push(el('div', { class: 'calendar__day calendar__day--outside', 'aria-hidden': 'true' }));
    }

    for (let day = 1; day <= length; day += 1) {
      const jalali = { jy: view.jy, jm: view.jm, jd: day };
      const { events, isHoliday, mine } = describeDay(jalali);
      const isToday = day === today.jd && view.jm === today.jm && view.jy === today.jy;
      const isSelected = day === selected.jd && view.jm === selected.jm && view.jy === selected.jy;
      const labelParts = [events[0]?.title, mine.length ? `${digits(mine.length)} یادداشت` : null].filter(Boolean);

      cells.push(
        el('button', {
          class: 'calendar__day',
          type: 'button',
          role: 'gridcell',
          text: digits(day),
          tabIndex: isSelected ? 0 : -1,
          'data-today': String(isToday),
          'data-selected': String(isSelected),
          'data-holiday': String(isHoliday),
          'data-event': String(events.length > 0),
          'data-mine': String(mine.length > 0),
          'aria-label': `${digits(day)} ${JALALI_MONTHS[view.jm - 1]}${labelParts.length ? ` — ${labelParts.join('، ')}` : ''}`,
          'aria-current': isToday ? 'date' : null,
          on: {
            click: () => {
              selected = jalali;
              render();
            },
            dblclick: () => {
              selected = jalali;
              addPersonal();
            },
          },
        }),
      );
    }

    grid.replaceChildren(...cells);
    renderDetail();
    renderUpcoming();
  }

  // تب جدید ممکن است چند روز باز بماند؛ با برگشتن به تب، «امروز» را تازه می‌کنیم
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    const now = toJalali(new Date());
    if (keyOf(now) !== keyOf(today)) backToToday();
  };
  document.addEventListener('visibilitychange', onVisible);

  const unsubscribe = onDataChanged(STORAGE_KEYS.events, (next) => {
    personal = next && typeof next === 'object' ? next : {};
    render();
  });

  render();
  (async () => {
    personal = (await readData(STORAGE_KEYS.events)) ?? {};
    render();
  })();

  return {
    element,
    refresh: render,
    destroy() {
      unsubscribe();
      clearTimeout(wheelReset);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}
