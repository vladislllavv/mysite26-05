// Netlify Function: sends landing page leads to Telegram.
// Required environment variables in Netlify:
// TELEGRAM_BOT_TOKEN = token from @BotFather
// TELEGRAM_CHAT_ID   = your user/group/channel chat_id

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method Not Allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return json(500, { ok: false, error: 'Telegram is not configured' });
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  // Honeypot anti-spam: bots often fill hidden fields.
  if (data.website) {
    return json(200, { ok: true });
  }

  const required = ['name', 'email', 'phone'];
  const missing = required.filter((field) => !String(data[field] || '').trim());
  if (missing.length) {
    return json(400, { ok: false, error: `Missing fields: ${missing.join(', ')}` });
  }

  const message = [
    '🚀 <b>Новая заявка с сайта СЕРВЕР-ДОМ</b>',
    '',
    `👤 <b>Имя:</b> ${escapeHtml(data.name)}`,
    `🏢 <b>Компания:</b> ${escapeHtml(data.company || '—')}`,
    `✉️ <b>Email:</b> ${escapeHtml(data.email)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(data.phone)}`,
    '',
    `💬 <b>Комментарий:</b>\n${escapeHtml(data.comment || '—')}`,
    '',
    `🕒 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`,
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Telegram API error:', result);
      return json(502, { ok: false, error: 'Telegram API error' });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Send lead error:', error);
    return json(500, { ok: false, error: 'Internal Server Error' });
  }
};
