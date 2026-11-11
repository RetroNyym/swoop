/* TwWa Panel arayuz mantigi */
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const durumKutu = $('#wa-durum');
const DURUM_METIN = {
  kapali: 'Bağlı değil',
  baglaniyor: 'Bağlanıyor…',
  qr: 'QR bekleniyor',
  beklemede: 'Yeniden bağlanıyor…',
  bagli: '✅ WhatsApp bağlı',
};
let aktifSekme = 'indir';
let kutuphaneVerisi = [];
let kisiListesi = [];
let filtreTur = 'hepsi';
let seciliEmoji = '';

/* ---------------- Sekmeler ---------------- */
$$('.sekme').forEach((b) => b.addEventListener('click', () => {
  $$('.sekme').forEach((x) => x.classList.remove('aktif'));
  $$('.panel').forEach((x) => x.classList.remove('aktif'));
  b.classList.add('aktif');
  $('#sekme-' + b.dataset.hedef).classList.add('aktif');
  aktifSekme = b.dataset.hedef;
  if (aktifSekme === 'kutuphane') kutuphaneYukle();
  if (aktifSekme === 'stickerlar') stickerlariYukle();
  if (aktifSekme === 'emojiler' && !emojilerHazir) emojileriCiz();
}));

$$('.f-btn').forEach((b) => b.addEventListener('click', () => {
  $$('.f-btn').forEach((x) => x.classList.remove('aktif'));
  b.classList.add('aktif');
  filtreTur = b.dataset.tur;
  kutuphaneCiz(kutuphaneVerisi);
}));

/* ---------------- Bildirim ---------------- */
let bildirimZamanlayici;
function bildir(mesaj, tur = '') {
  const b = $('#bildirim');
  b.textContent = mesaj;
  b.className = 'bildirim ' + tur;
  clearTimeout(bildirimZamanlayici);
  bildirimZamanlayici = setTimeout(() => b.classList.add('gizli'), 4000);
}

/* ---------------- WhatsApp durum ---------------- */
const socket = io();

socket.on('wa:durum', (d) => {
  durumKutu.textContent = DURUM_METIN[d] || d;
  durumKutu.className = 'durum-kutu ' + d;
  const qrAlan = $('#qr-alan');
  const qrBekleme = $('#qr-bekleme');
  if (d === 'bagli') {
    $('#qr-kod').classList.add('gizli');
    qrBekleme.textContent = '✅ Bağlandı! Artık gönderebilirsin.';
    qrBekleme.classList.remove('uyari-renk', 'gizli');
    kisileriYukle();
  } else if (d === 'qr') {
    qrBekleme.classList.add('gizli');
  } else {
    $('#qr-kod').classList.add('gizli');
    qrBekleme.classList.remove('gizli');
    qrBekleme.classList.toggle('uyari-renk', d === 'beklemede' || d === 'baglaniyor');
    qrBekleme.textContent = d === 'beklemede' || d === 'baglaniyor' ? 'Bağlantı kuruluyor…' : 'QR kod burada görünecek…';
  }
});

socket.on('wa:qr', (dataUrl) => {
  const img = $('#qr-kod');
  img.src = dataUrl;
  img.classList.remove('gizli');
  $('#qr-bekleme').classList.add('gizli');
});

socket.on('kisiler:guncel', () => { if (aktifDurumBagli()) kisileriYukle(); });
socket.on('kutuphane:guncel', () => { kutuphaneYukle(); });

function aktifDurumBagli() { return durumKutu.classList.contains('bagli'); }

/* ---------------- Kisiler ---------------- */
async function kisileriYukle() {
  try {
    const liste = await fetch('/api/kisiler').then((r) => r.json());
    kisiListesi = liste;
    for (const id of ['oto-kime', 'emoji-kime', 'gonder-kime']) {
      const sec = $('#' + id);
      const secili = sec.value;
      sec.innerHTML = '<option value="">Kişi seç…</option>' +
        liste.map((k) => `<option value="${k.jid}">${k.ad}</option>`).join('');
      sec.value = secili;
    }
  } catch {}
}

/* ---------------- Twitter indirme ---------------- */
$('#oto-gonder').addEventListener('change', (e) => {
  $('#oto-gonder-alan').classList.toggle('gizli', !e.target.checked);
  if (e.target.checked && aktifDurumBagli()) kisileriYukle();
});

$('#indir-btn').addEventListener('click', async () => {
  const url = $('#tweet-url').value.trim();
  if (!url) return bildir('Önce tweet linkini yapıştır', 'hata');
  const btn = $('#indir-btn');
  btn.disabled = true;
  $('#indir-sonuc').textContent = '';
  $('#indir-ilerleme').classList.remove('gizli');
  ilerlemeCiz(0, 'Başlatılıyor…');
  try {
    await fetch('/api/indir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        kalite: $('#kalite').value,
        kime: $('#oto-gonder').checked ? $('#oto-kime').value : '',
        baslik: $('#oto-baslik').value,
        otomatikGonder: $('#oto-gonder').checked,
      }),
    });
  } catch (e) {
    btn.disabled = false;
    $('#indir-ilerleme').classList.add('gizli');
    $('#indir-sonuc').textContent = 'Hata: ' + e.message;
    $('#indir-sonuc').className = 'sonuc hata';
  }
});

function ilerlemeCiz(yuzde, metin) {
  $('#indir-ilerleme .dolgu').style.width = yuzde + '%';
  $('#indir-ilerleme .metin').textContent = metin || '';
}

socket.on('ilerleme', (d) => {
  if (d.tur === 'indirme') ilerlemeCiz(d.yuzde, `İndiriliyor… %${d.yuzde}`);
  else if (d.tur === 'arac') ilerlemeCiz(d.yuzde, `İlk kurulum: ${d.ad}… %${d.yuzde || ''}`);
  else if (d.tur === 'gonderim') ilerlemeCiz(100, d.mesaj || 'Gönderiliyor…');
});

socket.on('indirme:bitti', (d) => {
  const btn = $('#indir-btn');
  btn.disabled = false;
  $('#indir-ilerleme').classList.add('gizli');
  const sonuc = $('#indir-sonuc');
  if (d.ok) {
    ilerlemeCiz(100, 'Tamamlandı');
    sonuc.className = 'sonuc ok';
    sonuc.textContent = (d.kayitlar || []).map((k) => '✅ ' + k.ad).join('\n');
    bildir('İndirme tamamlandı 🎉', 'ok');
    $('#tweet-url').value = '';
    kutuphaneYukle();
  } else {
    ilerlemeCiz(0, '');
    sonuc.className = 'sonuc hata';
    sonuc.textContent = '❌ ' + (d.hata || 'Bilinmeyen hata');
  }
});

socket.on('gonderim:sonuc', (d) => {
  if (d.ok) bildir('📤 ' + (d.mesaj || 'Gönderildi'), 'ok');
  else bildir('❌ ' + (d.hata || 'Gönderilemedi'), 'hata');
});

/* ---------------- Kutuphane ---------------- */
async function kutuphaneYukle() {
  try {
    kutuphaneVerisi = await fetch('/api/kutuphane').then((r) => r.json());
    kutuphaneCiz(kutuphaneVerisi);
    stickerlariCiz(kutuphaneVerisi);
  } catch {}
}

function kutuphaneCiz(liste) {
  const hedef = $('#kutuphane-liste');
  const filtreli = filtreTur === 'hepsi' ? liste : liste.filter((k) => k.tur === filtreTur);
  if (!filtreli.length) {
    hedef.innerHTML = '<p class="aciklama">Henüz öğe yok. Twitter sekmesinden bir şey indir 😉</p>';
    return;
  }
  hedef.innerHTML = filtreli.map(ogeHtml).join('');
  olaylariBag(hedef);
}

function stickerlariYukle() { kutuphaneYukle(); }
function stickerlariCiz(liste) {
  const hedef = $('#sticker-liste');
  const stickerlar = liste.filter((k) => k.tur === 'sticker');
  if (!stickerlar.length) {
    hedef.innerHTML = '<p class="aciklama">Henüz sticker yok. Kütüphanedeki GIF/resimlere "✨ Sticker" butonuna bas.</p>';
    return;
  }
  hedef.innerHTML = stickerlar.map(ogeHtml).join('');
  olaylariBag(hedef);
}

function ogeHtml(k) {
  const onizleme = (k.tur === 'video' || k.tur === 'gif')
    ? `<video class="onizleme" src="${k.url}" preload="metadata" muted></video>`
    : `<img class="onizleme ${k.tur === 'sticker' ? 'sticker' : ''}" src="${k.url}" loading="lazy" alt="">`;
  const stickerBtn = (k.tur === 'gif' || k.tur === 'resim') ? `<button data-islem="sticker" data-id="${k.id}" class="ikincil-btn kucuk">✨ Sticker</button>` : '';
  return `
  <div class="kart-oge" data-id="${k.id}">
    ${onizleme}
    <div class="bilgi">
      <div class="ad">${k.ad}</div>
      <div class="turlar">${k.tur} · ${(k.boyut / 1048576).toFixed(1)} MB</div>
    </div>
    <div class="butonlar">
      <button data-islem="gonder" data-id="${k.id}" data-tur="${k.tur}" class="ikincil-btn kucuk gonder-btn">📤 Gönder</button>
      ${stickerBtn}
      <button data-islem="sil" data-id="${k.id}" class="ikincil-btn kucuk kirmizi">🗑</button>
    </div>
  </div>`;
}

function olaylariBag(kapsayici) {
  kapsayici.querySelectorAll('button[data-islem]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const islem = btn.dataset.islem;
      const id = btn.dataset.id;
      const kayit = kutuphaneVerisi.find((k) => k.id === id);
      if (islem === 'gonder') gonderModaliAc(kayit, btn.dataset.tur);
      if (islem === 'sticker') stickerYap(id, btn);
      if (islem === 'sil') sil(id);
    });
  });
}

async function stickerYap(id, btn) {
  btn.disabled = true;
  try {
    const r = await fetch('/api/sticker-yap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    }).then((x) => x.json());
    if (r.hata) throw new Error(r.hata);
    bildir('✨ Sticker oluşturuldu', 'ok');
    kutuphaneYukle();
  } catch (e) {
    bildir('❌ ' + e.message, 'hata');
    btn.disabled = false;
  }
}

async function sil(id) {
  if (!confirm('Bu öğe silinsin mi?')) return;
  await fetch('/api/kutuphane/' + id, { method: 'DELETE' });
  kutuphaneYukle();
}

/* ---------------- Gonder modal ---------------- */
function gonderModaliAc(kayit, tur) {
  if (!aktifDurumBagli()) {
    bildir('Önce WhatsApp sekmesinden bağlan', 'hata');
    $$('.sekme').forEach((x) => x.classList.remove('aktif'));
    $$('.panel').forEach((x) => x.classList.remove('aktif'));
    document.querySelector('[data-hedef="baglanti"]').classList.add('aktif');
    $('#sekme-baglanti').classList.add('aktif');
    return;
  }
  $('#gonder-modal-baslik').textContent = '📤 ' + kayit.ad;
  $('#gonder-onizleme').innerHTML = (tur === 'video' || tur === 'gif')
    ? `<video src="${kayit.url}" autoplay muted loop></video>`
    : `<img src="${kayit.url}" alt="">`;
  $('#gif-onay-satiri').classList.toggle('gizli', tur !== 'video' && tur !== 'gif');
  $('#gonder-sonuc').textContent = '';
  $('#gonder-kime').value = '';
  $('#gonder-numara').value = '';
  $('#gonder-baslik').value = '';
  $('#gonder-modal').classList.remove('gizli');
  $('#gonder-modal').dataset.kayitId = kayit.id;
  kisileriYukle();
}

$('#gonder-iptal').addEventListener('click', () => $('#gonder-modal').classList.add('gizli'));

$('#gonder-onay').addEventListener('click', async () => {
  const kime = $('#gonder-kime').value || $('#gonder-numara').value.trim();
  if (!kime) { $('#gonder-sonuc').textContent = 'Kişi veya numara seç'; $('#gonder-sonuc').className = 'sonuc hata'; return; }
  const btn = $('#gonder-onay');
  btn.disabled = true;
  try {
    const r = await fetch('/api/gonder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: $('#gonder-modal').dataset.kayitId,
        kime,
        baslik: $('#gonder-baslik').value,
        gifOlarak: $('#gonder-gif').checked,
      }),
    }).then((x) => x.json());
    if (r.hata) throw new Error(r.hata);
    $('#gonder-modal').classList.add('gizli');
    bildir('📤 Gönderildi', 'ok');
  } catch (e) {
    $('#gonder-sonuc').textContent = '❌ ' + e.message;
    $('#gonder-sonuc').className = 'sonuc hata';
  }
  btn.disabled = false;
});

/* ---------------- Dosya yukleme ---------------- */
$('#yukle-dosya').addEventListener('change', async (e) => {
  const dosyalar = Array.from(e.target.files || []);
  const sonuc = $('#yukle-sonuc');
  sonuc.className = 'sonuc';
  sonuc.textContent = 'Yükleniyor…';
  let ok = 0, hata = 0;
  for (const d of dosyalar) {
    try {
      const veri = await new Promise((coz, ret) => {
        const oku = new FileReader();
        oku.onload = () => coz(oku.result);
        oku.onerror = ret;
        oku.readAsDataURL(d);
      });
      const r = await fetch('/api/yukle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: d.name, veri }),
      }).then((x) => x.json());
      if (r.hata) throw new Error(r.hata);
      ok++;
    } catch { hata++; }
  }
  sonuc.className = 'sonuc ' + (hata ? 'hata' : 'ok');
  sonuc.textContent = `✅ ${ok} dosya eklendi` + (hata ? `, ❌ ${hata} başarısız` : '');
  e.target.value = '';
  kutuphaneYukle();
});

/* ---------------- Emojiler ---------------- */
let emojilerHazir = false;
let aktifKategori = 'hepsi';

function emojileriCiz() {
  const katAlan = $('#emoji-kategoriler');
  katAlan.innerHTML = `<button class="cetik ${aktifKategori === 'hepsi' ? 'aktif' : ''}" data-kat="hepsi">Hepsi</button>` +
    EMOJI_KATEGORILER.map((k) => `<button class="cetik" data-kat="${k.ad}">${k.ad}</button>`).join('');
  katAlan.querySelectorAll('.cetik').forEach((c) => c.addEventListener('click', () => {
    aktifKategori = c.dataset.kat;
    katAlan.querySelectorAll('.cetik').forEach((x) => x.classList.remove('aktif'));
    c.classList.add('aktif');
    emojiListesiCiz();
  }));
  emojiListesiCiz();
  emojilerHazir = true;
}

function emojiListesiCiz() {
  const arama = $('#emoji-ara').value.trim().toLowerCase();
  const hedef = $('#emoji-liste');
  let html = '';
  for (const kat of EMOJI_KATEGORILER) {
    if (aktifKategori !== 'hepsi' && kat.ad !== aktifKategori) continue;
    const emojiler = arama
      ? kat.emojiler.filter((e) => kat.ad.toLowerCase().includes(arama) || e === arama)
      : kat.emojiler;
    if (arama && !emojiler.length && !kat.ad.toLowerCase().includes(arama)) continue;
    if (aktifKategori === 'hepsi') html += `<div class="kategori-baslik">${kat.ad}</div>`;
    html += emojiler.map((e) => `<div class="emoji-kutu" data-e="${e}">${e}</div>`).join('');
  }
  hedef.innerHTML = html || '<div class="kategori-baslik">Sonuç yok</div>';
  hedef.querySelectorAll('.emoji-kutu').forEach((k) => k.addEventListener('click', () => {
    seciliEmoji = k.dataset.e;
    $('#secili-emoji').textContent = seciliEmoji;
  }));
}

$('#emoji-ara').addEventListener('input', emojiListesiCiz);

$('#emoji-kopyala-btn').addEventListener('click', async () => {
  if (!seciliEmoji) return bildir('Önce bir emoji seç', 'hata');
  try { await navigator.clipboard.writeText(seciliEmoji); bildir('📋 Kopyalandı: ' + seciliEmoji, 'ok'); }
  catch { bildir('Kopyalanamadı', 'hata'); }
});

$('#emoji-gonder-btn').addEventListener('click', async () => {
  if (!seciliEmoji) return bildir('Önce bir emoji seç', 'hata');
  const kime = $('#emoji-kime').value;
  if (!aktifDurumBagli()) return bildir('Önce WhatsApp bağlantısı kur', 'hata');
  if (!kime) return bildir('Kişi seç', 'hata');
  const btn = $('#emoji-gonder-btn');
  btn.disabled = true;
  try {
    const r = await fetch('/api/emoji-gonder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: seciliEmoji, kime }),
    }).then((x) => x.json());
    if (r.hata) throw new Error(r.hata);
    bildir('📤 Emoji gönderildi: ' + seciliEmoji, 'ok');
  } catch (e) {
    bildir('❌ ' + e.message, 'hata');
  }
  btn.disabled = false;
});

/* ---------------- Baglanti butonlari ---------------- */
$('#baglanti-yenile').addEventListener('click', async () => {
  await fetch('/api/cikis', { method: 'POST' });
  bildir('Yeni QR hazırlanıyor…');
});

$('#baglanti-cikis').addEventListener('click', async () => {
  if (!confirm('WhatsApp oturumu kapatılsın mı? (Yeniden QR okutman gerekecek)')) return;
  await fetch('/api/cikis', { method: 'POST' });
  bildir('Oturum kapatıldı');
});

/* ---------------- Baslangic ---------------- */
kisileriYukle();
kutuphaneYukle();
fetch('/api/durum').then((r) => r.json()).then((d) => {
  if (d.wa === 'bagli') { durumKutu.textContent = DURUM_METIN.bagli; durumKutu.className = 'durum-kutu bagli'; kisileriYukle(); }
});
