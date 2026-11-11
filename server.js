/* ============================================================
   Swoop — Twitter indirici + WhatsApp gonderici
   + GIF / Sticker / Emoji kutuphanesi
   ============================================================ */
'use strict';

process.on('uncaughtException', (e) => console.error('[HATA]', e));
process.on('unhandledRejection', (e) => console.error('[HATA]', e));

const express = require('express');
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const { Server } = require('socket.io');
const qrcode = require('qrcode');
const sharp = require('sharp');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} = require('@whiskeysockets/baileys');

/* ---------------- Klasorler ---------------- */
const KOK = __dirname;
const DATA = path.join(KOK, 'data');
const INDIRILENLER = path.join(DATA, 'indirilenler');
const STICKERLAR = path.join(DATA, 'stickerlar');
const CEVIRI = path.join(DATA, 'ceviri');
const OTURUM = path.join(DATA, 'oturum');
const ARACLAR = path.join(DATA, 'araclar');
const YT_DLP = path.join(ARACLAR, 'yt-dlp.exe');
const FFMPEG = path.join(ARACLAR, 'ffmpeg.exe');
const FFPROBE = path.join(ARACLAR, 'ffprobe.exe');
const KUTUPHANE_DOSYA = path.join(DATA, 'kutuphane.json');
const KISILER_DOSYA = path.join(DATA, 'kisiler.json');
const PID_DOSYA = path.join(DATA, 'pid.txt');
const HAZIR_KAYNAK = path.join(KOK, 'hazir-gifler');
const HAZIR_HEDEF = path.join(DATA, 'hazir-gifler');

const PORT = process.env.PORT || 3560;

for (const d of [DATA, INDIRILENLER, STICKERLAR, CEVIRI, ARACLAR, HAZIR_HEDEF]) {
  fs.mkdirSync(d, { recursive: true });
}
fs.writeFileSync(PID_DOSYA, String(process.pid));

/* ---------------- Yardimcilar ---------------- */
function jsonOku(dosya, varsayilan) {
  try { return JSON.parse(fs.readFileSync(dosya, 'utf8')); } catch { return varsayilan; }
}
function jsonYaz(dosya, veri) {
  try { fs.writeFileSync(dosya, JSON.stringify(veri, null, 2)); } catch (e) { console.error('Yazma hatasi:', e.message); }
}
function yeniId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function rastgeleAd(uzunluk = 6) {
  let s = '';
  for (let i = 0; i < uzunluk; i++) s += 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)];
  return s;
}
function dosyaTuru(ad) {
  const e = path.extname(ad).toLowerCase();
  if (e === '.webp') return 'sticker';
  if (e === '.gif') return 'gif';
  if (['.mp4', '.mkv', '.webm', '.mov', '.avi'].includes(e)) return 'video';
  if (['.jpg', '.jpeg', '.png'].includes(e)) return 'resim';
  return 'diger';
}

/* ---------------- Web + Socket ---------------- */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '300mb' }));
app.use(express.static(path.join(KOK, 'public')));
app.use('/medya', express.static(DATA)); // indirilenler/ + stickerlar/ icin

function ilerle(veri) { io.emit('ilerleme', veri); }
function durumYayinla() { io.emit('wa:durum', waDurum); }

/* ---------------- Arac indirme (yt-dlp / ffmpeg) ---------------- */
async function dosyaIndir(url, hedef, etiket) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Indirme basarisiz (${res.status}): ${url}`);
  const toplam = Number(res.headers.get('content-length') || 0);
  let alinan = 0;
  const nodeStream = Readable.fromWeb(res.body);
  nodeStream.on('data', (c) => {
    alinan += c.length;
    if (toplam) ilerle({ tur: 'arac', ad: etiket, yuzde: Math.round((alinan / toplam) * 100) });
  });
  await pipeline(nodeStream, fs.createWriteStream(hedef));
}

let ytDlpPromise = null;
let ffmpegPromise = null;

async function ytDlpHazir() {
  if (!ytDlpPromise) {
    ytDlpPromise = (async () => {
      if (!fs.existsSync(YT_DLP)) {
        console.log('yt-dlp indiriliyor...');
        await dosyaIndir('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', YT_DLP, 'yt-dlp');
      }
    })().catch((e) => { ytDlpPromise = null; throw e; });
  }
  return ytDlpPromise;
}

async function ffmpegZipAc(zip) {
  ilerle({ tur: 'arac', ad: 'ffmpeg (aciliyor)', yuzde: 50 });
  await new Promise((coz, ret) => {
    spawn('powershell', ['-NoProfile', '-Command',
      `Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory('${zip}','${path.join(ARACLAR, 'ffmpeg-zip')}')`], { windowsHide: true })
      .on('exit', (k) => (k === 0 ? coz() : ret(new Error('zip acilamadi'))));
  });
  const kokZ = path.join(ARACLAR, 'ffmpeg-zip');
  const bin = (await fsp.readdir(kokZ))[0];
  for (const f of ['ffmpeg.exe', 'ffprobe.exe']) {
    await fsp.copyFile(path.join(kokZ, bin, 'bin', f), path.join(ARACLAR, f));
  }
  await fsp.rm(zip, { force: true });
  await fsp.rm(kokZ, { recursive: true, force: true });
}

function ffmpegHazir() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      if (!fs.existsSync(FFMPEG)) {
        console.log('ffmpeg indiriliyor (buyuk dosya, bir kez)...');
        const zip = path.join(ARACLAR, 'ffmpeg.zip');
        await dosyaIndir('https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', zip, 'ffmpeg');
        await ffmpegZipAc(zip);
      }
    })().catch((e) => { ffmpegPromise = null; throw e; });
  }
  return ffmpegPromise;
}

/* ---------------- Kutuphane ---------------- */
let kutuphane = jsonOku(KUTUPHANE_DOSYA, []);

function kutuphaneKaydet() { jsonYaz(KUTUPHANE_DOSYA, kutuphane); }

function kutuphaneyeEkle(dosyaYolu, ad, hazir = false) {
  const g = path.relative(DATA, dosyaYolu).replace(/\\/g, '/');
  if (kutuphane.some((k) => k.dosya === g)) return kutuphane.find((k) => k.dosya === g);
  const kayit = {
    id: yeniId(),
    ad: ad || path.basename(dosyaYolu),
    dosya: g,
    tur: dosyaTuru(dosyaYolu),
    boyut: fs.existsSync(dosyaYolu) ? fs.statSync(dosyaYolu).size : 0,
    tarih: new Date().toISOString(),
  };
  if (hazir) kayit.hazir = true;
  kutuphane.unshift(kayit);
  kutuphaneKaydet();
  io.emit('kutuphane:guncel');
  return kayit;
}

/* ---------------- Hazir GIF paketi ---------------- */
function hazirGifleriKur() {
  try {
    const kaynaklar = fs.readdirSync(HAZIR_KAYNAK).filter((f) => f.toLowerCase().endsWith('.gif'));
    // kopya klasor bossa paketi kopyala (kullanicinin silmeleri korunur)
    if (fs.readdirSync(HAZIR_HEDEF).length === 0) {
      for (const f of kaynaklar) {
        fs.copyFileSync(path.join(HAZIR_KAYNAK, f), path.join(HAZIR_HEDEF, f));
      }
    }
    for (const f of fs.readdirSync(HAZIR_HEDEF).filter((x) => x.toLowerCase().endsWith('.gif'))) {
      kutuphaneyeEkle(path.join(HAZIR_HEDEF, f), path.basename(f, '.gif'), true);
    }
  } catch (e) {
    console.error('Hazir GIF kurulum hatasi:', e.message);
  }
}

/* ---------------- Kisiler ---------------- */
let kisiler = jsonOku(KISILER_DOSYA, {}); // jid -> ad
let kisiKayitZamanlayici = null;
function kisiEkle(jid, ad) {
  if (!jid || jid.includes('status@broadcast') || jid.includes('@newsletter')) return;
  const eski = kisiler[jid] || '';
  if (ad && ad !== eski) {
    kisiler[jid] = ad;
    clearTimeout(kisiKayitZamanlayici);
    kisiKayitZamanlayici = setTimeout(() => jsonYaz(KISILER_DOSYA, kisiler), 1500);
    io.emit('kisiler:guncel');
  }
}

/* ---------------- WhatsApp ---------------- */
let sock = null;
let waDurum = 'kapali'; // kapali | baglaniyor | qr | bagli | beklemede

async function waBaslat() {
  if (sock) return;
  waDurum = 'baglaniyor';
  durumYayinla();
  try {
    const { state, saveCreds } = await useMultiFileAuthState(OTURUM);
    let version;
    try { ({ version } = await fetchLatestBaileysVersion()); } catch { version = undefined; }
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Swoop'),
      logger: pino({ level: 'silent' }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        waDurum = 'qr';
        durumYayinla();
        qrcode.toDataURL(qr, { margin: 1, width: 320 })
          .then((u) => io.emit('wa:qr', u))
          .catch(() => {});
      }
      if (connection === 'open') { waDurum = 'bagli'; durumYayinla(); console.log('WhatsApp bagli!'); }
      if (connection === 'close') {
        const kod = lastDisconnect?.error?.output?.statusCode;
        sock = null;
        if (kod === DisconnectReason.loggedOut) {
          waDurum = 'kapali'; durumYayinla();
          console.log('Oturum sonlandirildi, yeniden QR gerekli.');
          fsp.rm(OTURUM, { recursive: true, force: true }).catch(() => {});
        } else {
          waDurum = 'beklemede'; durumYayinla();
          console.log('Baglanti koptu, 5 sn sonra yeniden denenecek. Kod:', kod);
          setTimeout(waBaslat, 5000);
        }
      }
    });
    sock.ev.on('messages.upsert', ({ messages }) => {
      for (const m of messages || []) {
        if (m.pushName) kisiEkle(m.key.remoteJid, m.pushName);
      }
    });
  } catch (e) {
    sock = null;
    waDurum = 'beklemede';
    durumYayinla();
    console.error('WA baslatma hatasi:', e.message);
    setTimeout(waBaslat, 8000);
  }
}

function numaraJidYap(girdi) {
  if (!girdi) return null;
  girdi = String(girdi).trim();
  if (girdi.includes('@')) return girdi; // zaten jid (grup vb.)
  let n = girdi.replace(/\D/g, '');
  if (!n) return null;
  if (n.startsWith('0')) n = '90' + n.slice(1);
  return n + '@s.whatsapp.net';
}

async function bekle() { return new Promise((r) => setTimeout(r, 1000)); }

async function bagliBekle() {
  for (let i = 0; i < 20; i++) {
    if (waDurum === 'bagli' && sock) return true;
    await bekle();
  }
  return false;
}

async function gifToMp4(gifYolu) {
  await ffmpegHazir();
  const hedef = path.join(CEVIRI, path.basename(gifYolu, path.extname(gifYolu)) + '.mp4');
  await new Promise((coz, ret) => {
    spawn(FFMPEG, ['-y', '-i', gifYolu, '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
      '-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2', hedef], { windowsHide: true })
      .on('exit', (k) => (k === 0 ? coz() : ret(new Error('gif->mp4 donusumu basarisiz'))));
  });
  return hedef;
}

async function stickerYap(dosyaYolu) {
  const ext = path.extname(dosyaYolu).toLowerCase();
  const animated = ext === '.gif' || ext === '.webp';
  const hedef = path.join(STICKERLAR, path.basename(dosyaYolu, ext).slice(0, 40) + '-sticker.webp');
  const resim = sharp(dosyaYolu, { animated, limitInputPixels: false, failOn: 'none' });
  const secenekler = { effort: 5 };
  if (animated) secenekler.loop = 0;
  await resim
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp(secenekler)
    .toFile(hedef);
  return hedef;
}

async function medyaGonder(jid, dosyaYolu, secenek = {}) {
  if (!sock || waDurum !== 'bagli') throw new Error('WhatsApp is not connected');
  const buf = await fsp.readFile(dosyaYolu);
  const ext = path.extname(dosyaYolu).toLowerCase();
  if (ext === '.webp') {
    return sock.sendMessage(jid, { sticker: buf });
  }
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    return sock.sendMessage(jid, { image: buf, caption: secenek.baslik || undefined });
  }
  if (ext === '.gif') {
    const mp4 = await gifToMp4(dosyaYolu);
    return sock.sendMessage(jid, { video: await fsp.readFile(mp4), gifPlayback: true, mimetype: 'video/mp4', caption: secenek.baslik || undefined });
  }
  return sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', gifPlayback: !!secenek.gifOlarak, caption: secenek.baslik || undefined });
}

/* ---------------- API ---------------- */
app.get('/api/durum', (req, res) => {
  res.json({
    wa: waDurum,
    ytdlp: fs.existsSync(YT_DLP),
    ffmpeg: fs.existsSync(FFMPEG),
  });
});

app.get('/api/kisiler', (req, res) => {
  const liste = Object.entries(kisiler)
    .map(([jid, ad]) => ({ jid, ad: ad || jid.replace('@s.whatsapp.net', '').replace('@g.us', ' (grup)') }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  res.json(liste);
});

app.post('/api/indir', async (req, res) => {
  const { url, kalite = 'en-iyi', kime = '', baslik = '', otomatikGonder = false } = req.body || {};
  if (!url || !/https?:\/\//.test(url)) return res.status(400).json({ hata: 'Please enter a valid link' });
  if (otomatikGonder && !(waDurum === 'bagli' || await bagliBekle())) {
    return res.status(400).json({ hata: 'WhatsApp must be connected for auto-send' });
  }
  res.json({ ok: true });

  const kaliteFiltre = {
    'en-iyi': 'b[ext=mp4]/bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b',
    '720': 'b[ext=mp4][height<=720]/bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[height<=720]/b',
    '480': 'b[ext=mp4][height<=480]/bv*[ext=mp4][height<=480]+ba[ext=m4a]/b[height<=480]/b',
  }[kalite] || 'b[ext=mp4]/bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b';

  async function indirmeYap() {
    await ytDlpHazir();
    const oncekiDosyalar = new Set(await fsp.readdir(INDIRILENLER));
    const isimOnEk = 'tw-' + rastgeleAd();
    const args = [
      url, '--no-playlist', '--no-warnings', '--newline', '--restrict-filenames',
      '--ffmpeg-location', ARACLAR,
      '-f', kaliteFiltre,
      '--merge-output-format', 'mp4',
      '-o', path.join(INDIRILENLER, isimOnEk + '-%(title).60s.%(ext)s'),
    ];
    await new Promise((coz, ret) => {
      const p = spawn(YT_DLP, args, { windowsHide: true });
      let hataKuyruk = '';
      p.stdout.on('data', (d) => {
        const m = d.toString().match(/\[download\]\s+([\d.]+)%/);
        if (m) ilerle({ tur: 'indirme', ad: 'Twitter medyasi', yuzde: Math.round(parseFloat(m[1])) });
      });
      p.stderr.on('data', (d) => { hataKuyruk = (hataKuyruk + d.toString()).slice(-1500); });
      p.on('exit', (k) => (k === 0 ? coz() : ret(new Error(hataKuyruk || 'yt-dlp cikis: ' + k))));
      p.on('error', ret);
    });
    const sonraki = await fsp.readdir(INDIRILENLER);
    const yeniDosyalar = sonraki
      .filter((f) => !oncekiDosyalar.has(f))
      .filter((f) => !/\.(part|ytdl)$/i.test(f) && !/\.part-Frag/i.test(f))
      .map((f) => path.join(INDIRILENLER, f));
    if (!yeniDosyalar.length) throw new Error('No file downloaded — does the link contain a video or GIF?');
    return yeniDosyalar;
  }

  try {
    let yeniDosyalar;
    try {
      yeniDosyalar = await indirmeYap();
    } catch (ilk) {
      // ffmpeg henuz indiriliyorsa bekle, sonra bir kez daha dene
      if (/ffmpeg/i.test(ilk.message) && !fs.existsSync(FFMPEG)) {
        ilerle({ tur: 'arac', ad: 'ffmpeg hazirlaniyor (bir kez, lutfen bekle)', yuzde: 0 });
        await ffmpegHazir();
        yeniDosyalar = await indirmeYap();
      } else {
        throw ilk;
      }
    }

    const kayitlar = yeniDosyalar.map((f) => kutuphaneyeEkle(f));
    io.emit('indirme:bitti', { ok: true, kayitlar });

    if (otomatikGonder && kime) {
      const jid = numaraJidYap(kime);
      await bagliBekle();
      for (const f of yeniDosyalar) {
        await medyaGonder(jid, f, { baslik });
      }
      io.emit('gonderim:sonuc', { ok: true, mesaj: 'Otomatik gonderim tamam' });
    }
  } catch (e) {
    console.error('Indirme hatasi:', e.message);
    io.emit('indirme:bitti', { ok: false, hata: e.message });
  }
});

app.get('/api/kutuphane', (req, res) => {
  const liste = kutuphane
    .filter((k) => fs.existsSync(path.join(DATA, k.dosya)))
    .map((k) => ({ ...k, url: '/medya/' + k.dosya }));
  res.json(liste);
});

app.delete('/api/kutuphane/:id', async (req, res) => {
  const k = kutuphane.find((x) => x.id === req.params.id);
  if (k) {
    kutuphane = kutuphane.filter((x) => x.id !== k.id);
    kutuphaneKaydet();
    await fsp.rm(path.join(DATA, k.dosya), { force: true }).catch(() => {});
  }
  res.json({ ok: true });
});

app.post('/api/sticker-yap', async (req, res) => {
  try {
    const k = kutuphane.find((x) => x.id === req.body.id);
    if (!k) return res.status(404).json({ hata: 'Item not found' });
    const dosya = path.join(DATA, k.dosya);
    if (dosyaTuru(dosya) === 'video') {
      return res.status(400).json({ hata: 'Videos cannot be turned into stickers directly — use a GIF or animated image' });
    }
    const hedef = await stickerYap(dosya);
    const kayit = kutuphaneyeEkle(hedef, path.basename(hedef));
    res.json({ ok: true, kayit });
  } catch (e) {
    res.status(500).json({ hata: e.message });
  }
});

app.post('/api/gonder', async (req, res) => {
  try {
    const { id, kime, baslik = '', gifOlarak = false } = req.body || {};
    const k = kutuphane.find((x) => x.id === id);
    if (!k) return res.status(404).json({ hata: 'Item not found' });
    const jid = numaraJidYap(kime);
    if (!jid) return res.status(400).json({ hata: 'Pick a contact or enter a number' });
    if (waDurum !== 'bagli' && !(await bagliBekle())) {
      return res.status(400).json({ hata: 'WhatsApp is not connected' });
    }
    await medyaGonder(jid, path.join(DATA, k.dosya), { baslik, gifOlarak });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ hata: e.message });
  }
});

app.post('/api/emoji-gonder', async (req, res) => {
  try {
    const { emoji, kime } = req.body || {};
    const jid = numaraJidYap(kime);
    if (!emoji || !jid) return res.status(400).json({ hata: 'Emoji and contact are required' });
    if (waDurum !== 'bagli' && !(await bagliBekle())) {
      return res.status(400).json({ hata: 'WhatsApp is not connected' });
    }
    await sock.sendMessage(jid, { text: emoji });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ hata: e.message });
  }
});

app.post('/api/yukle', async (req, res) => {
  try {
    const { ad, veri } = req.body || {}; // veri: dataURL
    if (!ad || !veri || !/^data:/.test(veri)) return res.status(400).json({ hata: 'Invalid data' });
    const b64 = veri.slice(veri.indexOf(',') + 1);
    if (!['.mp4', '.gif', '.webp', '.jpg', '.jpeg', '.png', '.webm', '.mov'].includes(path.extname(ad).toLowerCase())) {
      return res.status(400).json({ hata: 'Unsupported file type' });
    }
    const hedefAd = rastgeleAd() + '-' + path.basename(ad).replace(/[^\w.\- ]/g, '_');
    const hedef = path.join(INDIRILENLER, hedefAd);
    await fsp.writeFile(hedef, Buffer.from(b64, 'base64'));
    const kayit = kutuphaneyeEkle(hedef, hedefAd);
    res.json({ ok: true, kayit });
  } catch (e) {
    res.status(500).json({ hata: e.message });
  }
});

app.post('/api/cikis', async (req, res) => {
  try { if (sock) await sock.logout(); } catch {}
  sock = null;
  waDurum = 'kapali';
  durumYayinla();
  await fsp.rm(OTURUM, { recursive: true, force: true }).catch(() => {});
  setTimeout(waBaslat, 1000);
  res.json({ ok: true });
});

/* ---------------- Baslat ---------------- */
server.listen(PORT, () => {
  console.log(`Swoop calisiyor: http://localhost:${PORT}`);
  hazirGifleriKur();
  waBaslat();
  ytDlpHazir().catch((e) => console.error('yt-dlp indirme hatasi:', e.message));
  ffmpegHazir().catch((e) => console.error('ffmpeg indirme hatasi:', e.message));
});
