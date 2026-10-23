/**
 * ماشین‌حساب کوچک و امن برای نوار جست‌وجو — بدون eval.
 *
 * تجزیه‌گر نزولی بازگشتی: + − × ÷ ^ ٪ و پرانتز، ارقام فارسی/عربی، و جداکنندهٔ
 * هزارگان. هر ورودی دیگری null برمی‌گرداند تا نوار جست‌وجو آن را جست‌وجوی معمولی بداند.
 */

import { toEnDigits } from './format.js';

const OPERATOR_ALIASES = [
  [/[×✕]/g, '*'],
  [/[÷]/g, '/'],
  [/[−–]/g, '-'],
  [/[٪]/g, '%'],
  [/٫/g, '.'], // ممیز فارسی
  [/[,،٬]/g, ''], // جداکنندهٔ هزارگان
];

function normalize(text) {
  let out = toEnDigits(text);
  for (const [pattern, replacement] of OPERATOR_ALIASES) out = out.replace(pattern, replacement);
  return out.replace(/\s+/g, '');
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/[\d.]/.test(char)) {
      const match = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\.?/i.exec(source.slice(index));
      if (!match) return null;
      tokens.push({ type: 'number', value: Number(match[0]) });
      index += match[0].length;
    } else if ('+-*/^%()'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      index += 1;
    } else {
      return null;
    }
  }
  return tokens;
}

function parse(tokens) {
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const isOp = (value) => peek()?.type === 'op' && peek().value === value;

  // expression := term (('+'|'-') term)*
  function expression() {
    let value = term();
    while (isOp('+') || isOp('-')) value = take().value === '+' ? value + term() : value - term();
    return value;
  }

  // term := unary (('*'|'/') unary)*
  function term() {
    let value = unary();
    while (isOp('*') || isOp('/')) value = take().value === '*' ? value * unary() : value / unary();
    return value;
  }

  // unary := ('-'|'+') unary | power   — منفی ضعیف‌تر از توان است: ‎-2^2 = -4
  function unary() {
    if (isOp('-')) {
      take();
      return -unary();
    }
    if (isOp('+')) {
      take();
      return unary();
    }
    return power();
  }

  // power := postfix ('^' unary)?   — توان از راست به چپ
  function power() {
    const base = postfix();
    if (isOp('^')) {
      take();
      return base ** unary();
    }
    return base;
  }

  // postfix := primary '%'*
  function postfix() {
    let value = primary();
    while (isOp('%')) {
      take();
      value /= 100;
    }
    return value;
  }

  function primary() {
    const token = take();
    if (!token) throw new Error('end');
    if (token.type === 'number') return token.value;
    if (token.value === '(') {
      const value = expression();
      if (!isOp(')')) throw new Error('paren');
      take();
      return value;
    }
    throw new Error('unexpected');
  }

  const value = expression();
  if (position !== tokens.length) throw new Error('trailing');
  return value;
}

/**
 * @param {string} text
 * @returns {number|null} نتیجه، یا null اگر ورودی یک عبارت حسابی واقعی نباشد
 */
export function evaluate(text) {
  const source = normalize(String(text ?? ''));
  // فقط وقتی حساب است که دست‌کم یک عملگر بین دو چیز داشته باشد — «۱۲۳» یا «-۵» حساب نیست
  if (!source || !/\d/.test(source) || !/[\d)%][+\-*/^]/.test(source)) return null;
  const tokens = tokenize(source);
  if (!tokens?.length) return null;
  try {
    const value = parse(tokens);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
