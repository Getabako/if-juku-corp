// アイの会話からの申し込みを Discord（フォーラムチャンネル）へ 1 件 1 スレッドで届ける
const clean = (v, n) => String(v || '').replace(/[@`]/g, '').slice(0, n).trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (!hook) return res.status(503).json({ error: 'no-hook' });
  const b = req.body || {};
  const type = clean(b.type, 60), name = clean(b.name, 80), contact = clean(b.contact, 120), body = clean(b.body, 1500);
  if (!name || !contact) return res.status(400).json({ error: 'missing' });
  const content = `**HPのアイから相談が届きました**\nご相談：${type}\nお名前：${name}\nご連絡先：${contact}\n内容：${body || '（なし）'}`;
  try {
    const r = await fetch(`${hook}?wait=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, ...(process.env.LEAD_WEBHOOK_FORUM === '1' ? { thread_name: `HP相談｜${type}｜${name}`.slice(0, 95) } : {}), allowed_mentions: { parse: [] } }),
    });
    if (!r.ok) return res.status(502).json({ error: 'discord', status: r.status });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'fetch' });
  }
}
