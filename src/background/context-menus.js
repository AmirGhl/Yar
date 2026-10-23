/**
 * منوی راست‌کلیک در هر صفحهٔ وب:
 *  - متن انتخاب‌شده → کار تازه / یادداشت تازه
 *  - پیوند یا خود صفحه → میان‌بر تازه در یار
 */

import { addTodo, addNote, addShortcut } from './user-data.js';
import { flashBadge } from './badge.js';

const MENU = {
  todo: 'yar:selection-todo',
  note: 'yar:selection-note',
  link: 'yar:link-shortcut',
  page: 'yar:page-shortcut',
};

/** ساختن منوها — در onInstalled صدا زده می‌شود (منوها بین اجراها باقی می‌مانند). */
export async function createContextMenus() {
  if (!chrome.contextMenus) return;
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU.todo, title: 'یار: افزودن «%s» به کارها', contexts: ['selection'] });
  chrome.contextMenus.create({ id: MENU.note, title: 'یار: ذخیره در یادداشت‌ها', contexts: ['selection'] });
  chrome.contextMenus.create({ id: MENU.link, title: 'یار: افزودن پیوند به میان‌برها', contexts: ['link'] });
  chrome.contextMenus.create({ id: MENU.page, title: 'یار: افزودن این صفحه به میان‌برها', contexts: ['page'] });
}

const SHORTCUT_RESULT = {
  added: ['✓', '#16a34a'],
  exists: ['=', '#64748b'],
  full: ['!', '#d97706'],
  invalid: ['×', '#dc2626'],
};

async function onClicked(info, tab) {
  try {
    if (info.menuItemId === MENU.todo) {
      await addTodo(info.selectionText);
      await flashBadge();
    } else if (info.menuItemId === MENU.note) {
      await addNote(info.selectionText, info.pageUrl ?? '');
      await flashBadge();
    } else if (info.menuItemId === MENU.link || info.menuItemId === MENU.page) {
      const url = info.menuItemId === MENU.link ? info.linkUrl : info.pageUrl;
      const title = info.menuItemId === MENU.page ? tab?.title : '';
      const result = await addShortcut(url, title);
      await flashBadge(...SHORTCUT_RESULT[result]);
    }
  } catch {
    await flashBadge('×', '#dc2626');
  }
}

export function listenContextMenus() {
  chrome.contextMenus?.onClicked.addListener(onClicked);
}
