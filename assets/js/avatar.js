// if塾 アバター版トップ: アイ（Live2D）と話すだけで、案内から申し込みまで
const $ = (id) => document.getElementById(id);
const logEl = $('chatLog');
const chipsEl = $('chips');
const sayEl = $('aiSay');
const form = $('chatForm');
const input = $('chatText');
const micBtn = $('micBtn');
const soundBtn = $('soundBtn');
const SIGNUP = 'https://service.if-juku.net/Ashura/signup';
const LINE_DEV = 'https://lin.ee/I4dbdzC';
const LINE_ASHURA = 'https://lin.ee/vuQ0087';
const MAIL = 'info@if-juku.net';
const IMG = (p) => `assets/img/${p}`;

let voiceOn = true;
let player = null;
let speaking = false;
const history = [];

/* ---------------- Live2D ---------------- */
async function loadAvatar() {
  const canvas = $('aiCanvas');
  try {
    const { P2LPlayer } = await import('../live2d/ai/p2l.js');
    player = await P2LPlayer.create(canvas, new URL('../live2d/ai/p2l_runtime.wasm', import.meta.url).href, new URL('../live2d/ai/model.p2lrt', import.meta.url).href);
    player.behaviors(1 | 2 | 4);
    const idle = player.clips.find((c) => c.toLowerCase() === 'idle');
    if (idle) player.play(idle);
    canvas.classList.add('ready');
    $('aiFallback').classList.add('hide');
    // 振り向きは小さめに（大きく向くと平面の絵が崩れて見える）
    const look = (x, y) => { try { player.lookAt(x * 0.35, y * 0.3); } catch {} };
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      look(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), Math.max(-1, Math.min(1, 1 - ((e.clientY - r.top) / r.height) * 2)));
    });
  } catch (e) {
    console.warn('Live2D を読み込めませんでした。静止画で表示します。', e);
  }
}
const expr = (name) => { try { if (player && player.expressions?.includes(name)) player.expression(name); else if (player) player.expression(null); } catch {} };
const motion = (name) => { try { const c = player?.clips.find((x) => x.toLowerCase() === name); if (c) { player.play(c); setTimeout(() => { const i = player.clips.find((x) => x.toLowerCase() === 'idle'); if (i) player.play(i); }, 1800); } } catch {} };

/* ---------------- voice out ---------------- */
let jpVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang?.startsWith('ja'));
  const pref = ['Kyoko', 'O-Ren', 'Nanami', 'Google 日本語', 'Haruka', 'Ayumi', 'Sayaka'];
  jpVoice = vs.find((v) => pref.some((p) => v.name.includes(p))) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

function mouthLoop() {
  if (!player) return;
  if (!speaking) { player.lipSync(0); return; }
  const t = performance.now() / 1000;
  player.lipSync(0.2 + Math.abs(Math.sin(t * 11)) * 0.7 * (0.6 + 0.4 * Math.abs(Math.sin(t * 2.3))));
  requestAnimationFrame(mouthLoop);
}
function showSay(text) {
  sayEl.textContent = text;
  sayEl.classList.add('show');
  clearTimeout(showSay.t);
  showSay.t = setTimeout(() => sayEl.classList.remove('show'), Math.max(3500, text.length * 140));
}
function speak(text) {
  showSay(text);
  const plain = text.replace(/[（(][^）)]*[）)]/g, '');
  if (!voiceOn || !('speechSynthesis' in window)) {
    speaking = true; mouthLoop(); setTimeout(() => { speaking = false; }, Math.min(5000, plain.length * 90));
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = 'ja-JP'; u.rate = 1.08; u.pitch = 1.25;
  if (jpVoice) u.voice = jpVoice;
  u.onstart = () => { speaking = true; mouthLoop(); };
  u.onend = u.onerror = () => { speaking = false; };
  speechSynthesis.speak(u);
}

/* ---------------- chat UI ---------------- */
const scroll = () => requestAnimationFrame(() => { logEl.scrollTop = logEl.scrollHeight; });
function addMsg(text, who = 'ai') {
  const d = document.createElement('div');
  d.className = `msg ${who}`;
  d.textContent = text;
  logEl.appendChild(d); scroll();
  return d;
}
function addTyping() { const d = document.createElement('div'); d.className = 'msg ai typing'; d.innerHTML = '<span></span><span></span><span></span>'; logEl.appendChild(d); scroll(); return d; }
function addCards(cards) {
  const wrap = document.createElement('div'); wrap.className = 'cards';
  cards.forEach((c) => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `${c.img ? `<img src="${c.img}" alt="" class="${c.ill ? 'card-ill' : ''}" loading="lazy">` : ''}<div class="card-body"><b>${c.title}</b>${c.price ? `<span class="price">${c.price}</span>` : ''}${c.text ? `<p>${c.text}</p>` : ''}</div>`;
    if (c.go) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'card-btn'; b.textContent = c.goLabel || 'これについて聞く';
      b.addEventListener('click', () => handle(c.go, c.title)); el.querySelector('.card-body').appendChild(b);
    }
    wrap.appendChild(el);
  });
  logEl.appendChild(wrap); scroll();
}
function addActions(list) {
  const wrap = document.createElement('div'); wrap.className = 'actions';
  list.forEach((a) => {
    const el = document.createElement(a.href ? 'a' : 'button');
    el.className = `act ${a.style || 'ghost'}`;
    el.innerHTML = `${a.icon ? `<i class="${a.icon}"></i>` : ''}${a.label}`;
    if (a.href) { el.href = a.href; if (!a.href.startsWith('mailto:')) { el.target = '_blank'; el.rel = 'noopener'; } }
    else { el.type = 'button'; el.addEventListener('click', a.onClick); }
    wrap.appendChild(el);
  });
  logEl.appendChild(wrap); scroll();
}
function setChips(list) {
  chipsEl.innerHTML = '';
  list.forEach(([label, go, icon]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
    b.innerHTML = `${icon ? `<i class="${icon}"></i>` : ''}${label}`;
    b.addEventListener('click', () => handle(go, label));
    chipsEl.appendChild(b);
  });
}
const MENU = [
  ['開発を頼みたい', 'dev', 'fa-solid fa-code'],
  ['研修・講座・講演', 'training', 'fa-solid fa-chalkboard-user'],
  ['AIを自分で使いたい', 'ashura', 'fa-solid fa-wand-magic-sparkles'],
  ['料金を知りたい', 'price', 'fa-solid fa-yen-sign'],
  ['どんな会社？', 'about', 'fa-solid fa-building'],
  ['実績を見たい', 'works', 'fa-solid fa-briefcase'],
  ['一緒に働きたい', 'join', 'fa-solid fa-seedling'],
];

async function aiSays(text, opts = {}) {
  const t = addTyping();
  await new Promise((r) => setTimeout(r, opts.delay ?? Math.min(900, 300 + text.length * 12)));
  t.remove();
  addMsg(text, 'ai');
  speak(text);
  if (opts.expr) expr(opts.expr);
  if (opts.motion) motion(opts.motion);
  history.push({ role: 'model', text });
}

/* ---------------- application flow ---------------- */
const lead = { type: '', name: '', contact: '', body: '' };
let awaiting = null; // 'name' | 'contact' | 'body'

async function startApply(type) {
  lead.type = type || '';
  if (!lead.type) {
    await aiSays('どんなご相談ですか？ 近いものを選んでくださいね。');
    setChips([
      ['アプリ・システム開発', 'apply:アプリ・システム開発'], ['LINE公式・ミニアプリ', 'apply:LINE公式・ミニアプリ'], ['Webサイト・LP', 'apply:Webサイト・LP'],
      ['業務の自動化', 'apply:業務の自動化（AI構築サポート）'], ['ゲーム開発', 'apply:ゲーム開発'], ['AI研修・講座', 'apply:AI研修・講座'],
      ['講演のご依頼', 'apply:講演'], ['AIカテキョ・伴走', 'apply:AIカテキョ・AI伴走コンサル'], ['その他', 'apply:その他'],
    ]);
    return;
  }
  awaiting = 'name';
  await aiSays(`「${lead.type}」ですね！ まず、お名前（会社名があれば一緒に）を教えてください。`, { expr: 'smile' });
  setChips([['やっぱりやめる', 'menu']]);
  input.placeholder = '例：山田太郎（株式会社サンプル）';
  input.focus();
}
async function nextApply(text) {
  if (awaiting === 'name') {
    lead.name = text; awaiting = 'contact';
    await aiSays(`${text.split(/[（(]/)[0]}さん、ありがとうございます。ご連絡先（メールアドレスか電話番号）を教えてください。`);
    input.placeholder = '例：taro@example.com';
    input.type = 'text';
    return;
  }
  if (awaiting === 'contact') {
    lead.contact = text; awaiting = 'body';
    await aiSays('最後に、困っていることや、やりたいことをひとことで。時期や予算の目安があれば一緒にどうぞ。');
    input.placeholder = '例：予約をLINEで受けたい。来月から使いたい';
    setChips([['特になし・会って話したい', 'apply-body:会って話したい']]);
    return;
  }
  if (awaiting === 'body') {
    lead.body = text; awaiting = null;
    input.placeholder = 'アイに話しかける（例：アプリを作りたい）';
    await aiSays('この内容でお送りしますね。確認して「送信する」を押してください。');
    const box = document.createElement('div'); box.className = 'summary';
    box.innerHTML = `<dl><dt>ご相談</dt><dd></dd><dt>お名前</dt><dd></dd><dt>ご連絡先</dt><dd></dd><dt>内容</dt><dd></dd></dl>`;
    const dds = box.querySelectorAll('dd');
    [lead.type, lead.name, lead.contact, lead.body].forEach((v, i) => { dds[i].textContent = v; });
    logEl.appendChild(box); scroll();
    addActions([
      { label: '送信する', icon: 'fa-solid fa-paper-plane', style: 'primary', onClick: submitLead },
      { label: '最初からやり直す', icon: 'fa-solid fa-rotate-left', onClick: () => startApply('') },
    ]);
    setChips(MENU);
  }
}
async function submitLead() {
  const text = `【ご相談】${lead.type}\nお名前：${lead.name}\nご連絡先：${lead.contact}\n\n${lead.body}\n\n（ホームページのアイから送信）`;
  try {
    const r = await fetch('api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    if (!r.ok) throw new Error(String(r.status));
    await aiSays('送信しました！ 担当の高崎か山﨑から、2営業日以内にご連絡しますね。ほかに気になることはありますか？', { expr: 'smile', motion: 'nod' });
    setChips(MENU);
  } catch {
    await aiSays('ごめんなさい、ここからは直接送れませんでした。下のボタンから、同じ内容をメールかLINEで送れます。');
    addActions([
      { label: 'メールで送る', icon: 'fa-solid fa-envelope', style: 'primary', href: `mailto:${MAIL}?subject=${encodeURIComponent(`【ご相談】${lead.type}（${lead.name}）`)}&body=${encodeURIComponent(text)}` },
      { label: 'LINEで相談する', icon: 'fa-brands fa-line', style: 'line', href: LINE_DEV },
    ]);
  }
}

/* ---------------- intents ---------------- */
const INTENTS = {
  async greet() {
    await aiSays('こんにちは！ if塾の案内役、アイです。開発、研修、講演のご相談から、お申し込みまで、ここで全部できます。何について聞きたいですか？', { expr: 'smile' });
    setChips(MENU);
  },
  async menu() { await aiSays('ほかに、何について聞きたいですか？'); setChips(MENU); },
  async dev() {
    await aiSays('if塾は、AIを使いこなして、アプリやLINE、Webをつくる会社です。月数万円の小さな仕事から、業務システムまでお受けしています。');
    addCards([
      { img: IMG('scene/relax.png'), ill: true, title: '業務の自動化', text: '予約確認・書類送付・SNS投稿を毎日自動に', go: 'auto' },
      { img: IMG('screen/km-home.jpg'), title: 'アプリ・システム', text: '予約・シフト・発注などの業務アプリ', go: 'apply:アプリ・システム開発', goLabel: 'これを相談する' },
      { img: IMG('scene/wave.png'), ill: true, title: 'LINE公式・ミニアプリ', text: 'LINEで予約・会員証・お知らせ', go: 'apply:LINE公式・ミニアプリ', goLabel: 'これを相談する' },
      { img: IMG('screen/kitazuna-title.jpg'), title: 'ゲーム開発', text: '自社IP Kitazuna を内製。PR・研修用も', go: 'game' },
    ]);
    await aiSays('相談は無料です。決まっていないことは、一緒に整理するので大丈夫ですよ。');
    setChips([['このまま相談を申し込む', 'apply', 'fa-solid fa-paper-plane'], ['料金の目安', 'price', 'fa-solid fa-yen-sign'], ['実績を見たい', 'works'], ['ほかの話', 'menu']]);
  },
  async auto() {
    await aiSays('たとえば、あるお店では小さなPC1台で、予約の確認やブログ更新、税理士さんへの書類送付、SNS投稿まで、毎日20本の業務が自動で回っています。止まらないための見張りまでお任せください。');
    setChips([['うちでもやりたい', 'apply:業務の自動化（AI構築サポート）', 'fa-solid fa-paper-plane'], ['料金の目安', 'price'], ['ほかの話', 'menu']]);
  },
  async training() {
    await aiSays('研修と講演は、大学、自治体、企業、学校のPTAなどで続けています。現場の仕事を題材にするので、明日から使えるのが自慢です。');
    addCards([
      { img: IMG('photo/lecture-1.jpg'), title: '講演・研修', price: '5.5万円〜<small>/回</small>', text: 'PTA・学校・団体・企業向け', go: 'apply:講演', goLabel: '講演を申し込む' },
      { img: IMG('photo/lecture-group.jpg'), title: '社員向けAI研修', price: '3万円〜<small>/人</small>', text: 'ハンズオンで業務に落とし込む', go: 'apply:AI研修・講座', goLabel: '研修を申し込む' },
      { img: IMG('scene/listen.png'), ill: true, title: 'AIカテキョ', price: '5.5万円<small>/月</small>', text: 'マンツーマンでAIの使い方を', go: 'apply:AIカテキョ・AI伴走コンサル', goLabel: '申し込む' },
    ]);
    setChips([['研修・講座を申し込む', 'apply:AI研修・講座', 'fa-solid fa-paper-plane'], ['講演を依頼する', 'apply:講演', 'fa-solid fa-microphone'], ['ほかの話', 'menu']]);
  },
  async ashura() {
    await aiSays('自分でAIを使いこなしたいなら、アシュラがおすすめです。私たちが案件で使っている開発キットが、月16,500円で使い放題。まずは30日間、無料で全部試せます。', { expr: 'smile' });
    addCards([
      { img: IMG('chara/ashura_happy.png'), ill: true, title: 'アシュラ会員', price: '16,500円<small>/月（税込）</small>', text: '48種類の開発キット・自習講座・会員コミュニティ' },
      { img: IMG('screen/km-genre.jpg'), title: 'たとえば電子書籍', text: '形式を選んで話すだけで、Kindle出版まで' },
      { img: IMG('screen/fb-group.jpg'), title: '会員コミュニティ', text: '困ったらすぐ質問できる' },
    ]);
    addActions([
      { label: '30日無料で始める', icon: 'fa-solid fa-wand-magic-sparkles', style: 'primary', href: SIGNUP },
      { label: '公式LINEで質問', icon: 'fa-brands fa-line', style: 'line', href: LINE_ASHURA },
    ]);
    setChips([['料金の目安', 'price'], ['開発を頼みたい', 'dev'], ['ほかの話', 'menu']]);
  },
  async price() {
    await aiSays('料金の目安です。開発は5万円から。内容を伺って、固定額でお見積もりします。');
    addCards([
      { img: IMG('scene/price.png'), ill: true, title: 'つくってほしい', price: '5万円〜', text: 'LP・LINE 15万円〜／業務アプリ 30万円〜／保守は月数千円〜', go: 'apply', goLabel: '見積もりを相談' },
      { img: IMG('scene/listen.png'), ill: true, title: '一緒に進めたい', price: '5.5万円〜<small>/月</small>', text: 'AIカテキョ 月5.5万円／伴走コンサル 月33万円／講演 1回5.5万円〜', go: 'training', goLabel: '詳しく' },
      { img: IMG('chara/ashura_suggest.png'), ill: true, title: '自分でつくりたい', price: '16,500円<small>/月</small>', text: 'アシュラ会員。30日間は無料', go: 'ashura', goLabel: '詳しく' },
    ]);
    setChips([['見積もりを相談する', 'apply', 'fa-solid fa-paper-plane'], ['アシュラを試す', 'ashura'], ['ほかの話', 'menu']]);
  },
  async about() {
    await aiSays('if塾は、2019年に秋田で生まれたプログラミングとAIの塾が始まりです。いまは、育った若手がAIを使って、県内外の企業にITを届けています。2027年4月に株式会社になります。');
    addCards([
      { img: IMG('photo/takasaki.jpg'), title: '代表取締役 高崎 翔太', text: '元臨床心理士。2019年にif(塾)を創業' },
      { img: IMG('photo/yamazaki.jpg'), title: '取締役 山﨑 琢己', text: '現場責任者。育成と案件の割り振り' },
      { img: IMG('photo/lecture-group.jpg'), title: '秋田の現場で', text: '講演会・体験会・eスポーツ大会' },
    ]);
    addActions([{ label: '会社案内PDF', icon: 'fa-solid fa-file-arrow-down', style: 'dark', href: 'assets/doc/if-juku-company-profile.pdf' }, { label: '普通のホームページで見る', icon: 'fa-solid fa-newspaper', href: 'home.html' }]);
    setChips([['開発を頼みたい', 'dev'], ['研修・講演', 'training'], ['ほかの話', 'menu']]);
  },
  async works() {
    await aiSays('これまでの実績の一部です。地元のお店から、県外の企業まで。高校生や大学生のメンバーも担当しています。');
    addCards([
      { img: IMG('scene/works.png'), ill: true, title: '美容室の予約アプリ', text: 'LINEで予約、お店はスマホで管理' },
      { img: IMG('scene/relax.png'), ill: true, title: '20本の業務を自動化', text: '小さなPC1台で毎日' },
      { img: IMG('photo/esports-1.jpg'), title: 'eスポーツのAIコーチ', text: '音声と生成AIでプレイを分析' },
      { img: IMG('photo/lecture-1.jpg'), title: '大学・自治体の研修', text: 'AI講座・活用支援・講演' },
    ]);
    setChips([['似たものを頼みたい', 'apply', 'fa-solid fa-paper-plane'], ['料金の目安', 'price'], ['ほかの話', 'menu']]);
  },
  async game() {
    await aiSays('Kitazuna は、秋田の文化を詰め込んだ私たちのRPGです。キャラもBGMも、AIを使いこなして少人数で作りました。企業PRや研修用のゲームもお受けします。');
    addActions([{ label: 'Kitazunaで遊ぶ', icon: 'fa-solid fa-gamepad', style: 'dark', href: 'https://kitazuna.if-juku.net/' }]);
    setChips([['ゲーム開発を相談', 'apply:ゲーム開発', 'fa-solid fa-paper-plane'], ['ほかの話', 'menu']]);
  },
  async join() {
    await aiSays('うれしいです！ if塾では、仕事を通じて学べます。検収を通った仕事にだけ報酬が出て、実績はちゃんと記録に残ります。学歴や出社は問いません。');
    addActions([{ label: 'LINEで話を聞く', icon: 'fa-brands fa-line', style: 'line', href: LINE_DEV }]);
    setChips([['申し込みフォームで送る', 'apply:一緒に働きたい', 'fa-solid fa-paper-plane'], ['ほかの話', 'menu']]);
  },
  async platform() {
    await aiSays('予約アプリを、お店が登録するだけで使える仕組みを準備中です。アカウントを作って、お店を登録すれば、LINEで予約を受けられます。先行利用のご相談もどうぞ。');
    setChips([['先行利用を相談する', 'apply:予約プラットフォームの先行利用', 'fa-solid fa-paper-plane'], ['ほかの話', 'menu']]);
  },
};

const KEYWORDS = [
  [/研修|講座|セミナー|勉強会|ワークショップ|教えて欲しい|教えてほしい|カテキョ|学びたい/, 'training'],
  [/講演|登壇|話して(ほしい|欲しい)|PTA/, 'training'],
  [/アシュラ|サブスク|自分で(使|作|つく)|ツール|奥義|無料体験|お試し/, 'ashura'],
  [/料金|値段|価格|費用|いくら|予算|見積/, 'price'],
  [/自動化|自動で|効率化|楽に/, 'auto'],
  [/予約.*(お店|店舗|登録)|プラットフォーム/, 'platform'],
  [/ゲーム|Kitazuna|キタズナ/i, 'game'],
  [/実績|事例|作ったもの|納品/, 'works'],
  [/会社|どんな|誰|代表|社長|場所|どこ|秋田/, 'about'],
  [/働きたい|仲間|採用|インターン|バイト|求人|参加したい/, 'join'],
  [/申し込|申込|依頼したい|お願いしたい|相談したい|問い合わせ|連絡/, 'apply'],
  [/開発|アプリ|システム|作って|つくって|LINE|ライン|ホームページ|サイト|LP|DX/, 'dev'],
  [/こんにちは|はじめまして|やあ|hello|hi/i, 'greet'],
];

async function freeChat(text) {
  try {
    const r = await fetch('api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: history.slice(-8) }) });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    if (!d.reply) throw new Error('empty');
    await aiSays(d.reply);
    if (d.intent && INTENTS[d.intent] && d.intent !== 'greet') return INTENTS[d.intent]();
    setChips([['相談を申し込む', 'apply', 'fa-solid fa-paper-plane'], ...MENU.slice(0, 4)]);
  } catch {
    await aiSays('ごめんなさい、うまく聞き取れなかったかもしれません。近いものを選んでもらえますか？');
    setChips(MENU);
  }
}

async function handle(go, label) {
  if (label) { addMsg(label, 'me'); history.push({ role: 'user', text: label }); }
  if (go.startsWith('apply-body:')) return nextApply(go.slice(11));
  if (go === 'apply') return startApply('');
  if (go.startsWith('apply:')) return startApply(go.slice(6));
  const fn = INTENTS[go];
  if (fn) return fn();
}

async function onUserText(text) {
  text = text.trim();
  if (!text) return;
  addMsg(text, 'me');
  history.push({ role: 'user', text });
  if (awaiting) return nextApply(text);
  const hit = KEYWORDS.find(([re]) => re.test(text));
  if (hit) return hit[1] === 'apply' ? startApply('') : INTENTS[hit[1]]();
  return freeChat(text);
}

form.addEventListener('submit', (e) => { e.preventDefault(); const t = input.value; input.value = ''; onUserText(t); });

/* ---------------- voice in ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) micBtn.hidden = true;
let rec = null;
micBtn.addEventListener('click', () => {
  if (!SR) return;
  if (rec) { rec.stop(); return; }
  try { speechSynthesis.cancel(); } catch {}
  rec = new SR(); rec.lang = 'ja-JP'; rec.interimResults = true; rec.maxAlternatives = 1;
  micBtn.classList.add('listening');
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finalText += t; else interim += t; }
    input.value = finalText || interim;
  };
  rec.onend = () => { micBtn.classList.remove('listening'); const t = input.value; rec = null; if (t.trim()) { input.value = ''; onUserText(t); } };
  rec.onerror = () => { micBtn.classList.remove('listening'); rec = null; };
  rec.start();
});

soundBtn.addEventListener('click', () => {
  voiceOn = !voiceOn;
  soundBtn.setAttribute('aria-pressed', String(voiceOn));
  soundBtn.innerHTML = `<i class="fa-solid ${voiceOn ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
  if (!voiceOn) try { speechSynthesis.cancel(); } catch {}
});

/* ---------------- start ---------------- */
function start(withVoice) {
  voiceOn = withVoice;
  soundBtn.setAttribute('aria-pressed', String(voiceOn));
  soundBtn.innerHTML = `<i class="fa-solid ${voiceOn ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
  $('startLayer').classList.add('hide');
  if (withVoice && 'speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(''); speechSynthesis.speak(u); }
  INTENTS.greet();
}
$('startBtn').addEventListener('click', () => start(true));
$('startQuiet').addEventListener('click', () => start(false));
const q = new URLSearchParams(location.search).get('q');
loadAvatar();
if (q) { $('startLayer').classList.add('hide'); voiceOn = false; INTENTS.greet().then(() => onUserText(q)); }
