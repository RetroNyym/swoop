/* Swoop arayuz mantigi (TR/EN) */
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ---------------- Dil ---------------- */
let DIL_ADI = localStorage.getItem('dil') || 'tr';
let T = DILLER[DIL_ADI];

function t(anahtar) { return T[anahtar] || DILLER.tr[anahtar] || anahtar; }

function dilUygula() {
  document.documentElement.lang = DIL_ADI;
  $('#dil-btn').textContent = DIL_ADI === 'tr' ? '🇬🇧 EN' : '🇹🇷 TR';
  $$('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  durumKutu.textContent = t('durum_' + sonWaDurum);
  durumKutu.className = 'durum-kutu ' + sonWaDurum;
  $$('[data-hedef]').forEach((btn) => {
    if (btn.classList.contains('sekme')) {
      const sec = document.querySelectorAll('.sekme');
    }
  });
  emojiKategorileriCiz();
  kutuphaneCiz(kutuphaneVerisi);
  stickerlariCiz(kutuphaneVerisi);
  hazirCiz(kutuphaneVerisi);
}

function dilDegistir() {
  DIL_ADI = DIL_ADI === 'tr' ? 'en' : 'tr';
  localStorage.setItem('dil', DIL_ADI);
  T = DILLER[DIL_ADI];
  dilUygula();
}

$('#dil-btn').addEventListener('click', dilDegistir);

/* ---------------- Durum degiskenleri ---------------- */
let aktifSekme = 'indir';
let kutuphaneVerisi = [];
let kisiListesi = [];
let filtreTur = 'hepsi';
let seciliEmoji = '';
let sonWaDurum = 'kapali';

const durumKutu = $('#wa-durum');

/* ---------------- Sekmeler ---------------- */
$$('.sekme').forEach((b) => b.addEventListener('click', () => {
  $$('.sekme').forEach((x) => x.classList.remove('aktif'));
  $$('.panel').forEach((x) => x.classList.remove('aktif'));
  b.classList.add('aktif');
  $('#sekme-' + b.dataset.hedef).classList.add('aktif');
  aktifSekme = b.dataset.hedef;
  if (aktifSekme === 'kutuphane') kutuphaneYukle();
  if (aktifSekme === 'stickerlar') kutuphaneYukle();
  if (aktifSekme === 'hazir') kutuphaneYukle();
  if (aktifSekme === 'emojiler' && !emojilerHazir) emojiKategorileriCiz();
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
  sonWaDurum = d;
  durumKutu.textContent = t('durum_' + d) || d;
  durumKutu.className = 'durum-kutu ' + d;
  const qrBekleme = $('#qr-bekleme');
  if (d === 'bagli') {
    $('#qr-kod').classList.add('gizli');
    qrBekleme.textContent = t('qr_bagli');
    qrBekleme.classList.remove('uyari-renk', 'gizli');
    kisileriYukle();
  } else if (d === 'qr') {
    qrBekleme.classList.add('gizli');
  } else {
    $('#qr-kod').classList.add('gizli');
    qrBekleme.classList.remove('gizli');
    qrBekleme.classList.toggle('uyari-renk', d === 'beklemede' || d === 'baglaniyor');
    qrBekleme.textContent = (d === 'beklemede' || d === 'baglaniyor') ? t('qr_baglaniyor') : t('qr_bos');
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
      sec.innerHTML = `<option value="">${t('kisi_sec')}</option>` +
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
  if (!url) return;
  const btn = $('#indir-btn');
  btn.disabled = true;
  $('#indir-sonuc').textContent = '';
  $('#indir-ilerleme').classList.remove('gizli');
  ilerlemeCiz(0, t('ilerleme_baslat'));
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
    $('#indir-sonuc').textContent = 'Error: ' + e.message;
    $('#indir-sonuc').className = 'sonuc hata';
  }
});

function ilerlemeCiz(yuzde, metin) {
  $('#indir-ilerleme .dolgu').style.width = yuzde + '%';
  $('#indir-ilerleme .metin').textContent = metin || '';
}

socket.on('ilerleme', (d) => {
  if (d.tur === 'indirme') ilerlemeCiz(d.yuzde, `${t('ilerleme_indiriliyor')} %${d.yuzde}`);
  else if (d.tur === 'arac') ilerlemeCiz(d.yuzde, `${t('ilerleme_kurulum')} ${d.ad}… %${d.yuzde || ''}`);
  else if (d.tur === 'gonderim') ilerlemeCiz(100, d.mesaj || t('b_gonderildi'));
});

socket.on('indirme:bitti', (d) => {
  const btn = $('#indir-btn');
  btn.disabled = false;
  $('#indir-ilerleme').classList.add('gizli');
  const sonuc = $('#indir-sonuc');
  if (d.ok) {
    ilerlemeCiz(100, '✔');
    sonuc.className = 'sonuc ok';
    sonuc.textContent = (d.kayitlar || []).map((k) => '✅ ' + k.ad).join('\n');
    bildir(t('b_indirildi'), 'ok');
    $('#tweet-url').value = '';
    kutuphaneYukle();
  } else {
    ilerlemeCiz(0, '');
    sonuc.className = 'sonuc hata';
    sonuc.textContent = '❌ ' + (d.hata || 'Error');
  }
});

socket.on('gonderim:sonuc', (d) => {
  if (d.ok) bildir(t('b_gonderildi'), 'ok');
  else bildir('❌ ' + (d.hata || 'Error'), 'hata');
});

/* ---------------- Kutuphane ---------------- */
async function kutuphaneYukle() {
  try {
    kutuphaneVerisi = await fetch('/api/kutuphane').then((r) => r.json());
    kutuphaneCiz(kutuphaneVerisi);
    stickerlariCiz(kutuphaneVerisi);
    hazirCiz(kutuphaneVerisi);
  } catch {}
}

function kutuphaneCiz(liste) {
  const hedef = $('#kutuphane-liste');
  const filtreli = filtreTur === 'hepsi' ? liste : liste.filter((k) => k.tur === filtreTur);
  if (!filtreli.length) {
    hedef.innerHTML = `<p class="aciklama">${t('kutuphane_bos')}</p>`;
    return;
  }
  hedef.innerHTML = filtreli.map(ogeHtml).join('');
  olaylariBag(hedef);
}

function hazirCiz(liste) {
  const hedef = $('#hazir-liste');
  const hazirlar = liste.filter((k) => k.hazir && k.tur === 'gif');
  if (!hazirlar.length) {
    hedef.innerHTML = `<p class="aciklama">${t('kutuphane_bos')}</p>`;
    return;
  }
  hedef.innerHTML = hazirlar.map(ogeHtml).join('');
  olaylariBag(hedef);
}

function stickerlariCiz(liste) {
  const hedef = $('#sticker-liste');
  const stickerlar = liste.filter((k) => k.tur === 'sticker');
  if (!stickerlar.length) {
    hedef.innerHTML = `<p class="aciklama">${t('sticker_bos')}</p>`;
    return;
  }
  hedef.innerHTML = stickerlar.map(ogeHtml).join('');
  olaylariBag(hedef);
}

function ogeHtml(k) {
  const onizleme = (k.tur === 'video' || k.tur === 'gif')
    ? `<video class="onizleme" src="${k.url}" preload="metadata" muted></video>`
    : `<img class="onizleme ${k.tur === 'sticker' ? 'sticker' : ''}" src="${k.url}" loading="lazy" alt="">`;
  const stickerBtn = (k.tur === 'gif' || k.tur === 'resim') ? `<button data-islem="sticker" data-id="${k.id}" class="ikincil-btn kucuk">${t('etiket_sticker')}</button>` : '';
  return `
  <div class="kart-oge" data-id="${k.id}">
    ${onizleme}
    <div class="bilgi">
      <div class="ad">${k.ad}</div>
      <div class="turlar">${k.tur} · ${(k.boyut / 1048576).toFixed(1)} MB</div>
    </div>
    <div class="butonlar">
      <button data-islem="gonder" data-id="${k.id}" data-tur="${k.tur}" class="ikincil-btn kucuk gonder-btn">${t('etiket_gonder')}</button>
      ${stickerBtn}
      <button data-islem="sil" data-id="${k.id}" class="ikincil-btn kucuk kirmizi">${t('etiket_sil')}</button>
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
    bildir(t('b_sticker_ok'), 'ok');
    kutuphaneYukle();
  } catch (e) {
    bildir('❌ ' + e.message, 'hata');
    btn.disabled = false;
  }
}

async function sil(id) {
  if (!confirm(t('b_silme_sorusu'))) return;
  await fetch('/api/kutuphane/' + id, { method: 'DELETE' });
  kutuphaneYukle();
}

/* ---------------- Gonder modal ---------------- */
function gonderModaliAc(kayit, tur) {
  if (!aktifDurumBagli()) {
    bildir(t('b_once_baglan'), 'hata');
    $$('.sekme').forEach((x) => x.classList.remove('aktif'));
    $$('.panel').forEach((x) => x.classList.remove('aktif'));
    document.querySelector('[data-hedef="baglanti"]').classList.add('aktif');
    $('#sekme-baglanti').classList.add('aktif');
    aktifSekme = 'baglanti';
    return;
  }
  $('#gonder-modal-baslik').textContent = t('etiket_gonder') + ' · ' + kayit.ad;
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
  if (!kime) { $('#gonder-sonuc').textContent = t('s_kisi_numara_gerekli'); $('#gonder-sonuc').className = 'sonuc hata'; return; }
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
    bildir(t('b_gonderildi'), 'ok');
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
  sonuc.textContent = t('b_yukleniyor');
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
  sonuc.textContent = t('b_dosya_eklendi').replace('%d', ok) + (hata ? t('b_dosya_hata').replace('%d', hata) : '');
  e.target.value = '';
  kutuphaneYukle();
});

/* ---------------- Emojiler ---------------- */
let emojilerHazir = false;
let aktifKategori = 'hepsi';

function emojiKategorileriCiz() {
  const katAlan = $('#emoji-kategoriler');
  katAlan.innerHTML = `<button class="cetik ${aktifKategori === 'hepsi' ? 'aktif' : ''}" data-kat="hepsi">${t('kategori_hepsi')}</button>` +
    EMOJI_KATEGORILER.map((k) => `<button class="cetik" data-kat="${DIL_ADI === 'tr' ? k.ad : k.en}">${DIL_ADI === 'tr' ? k.ad : k.en}</button>`).join('');
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
    const katAd = DIL_ADI === 'tr' ? kat.ad : kat.en;
    if (aktifKategori !== 'hepsi' && katAd !== aktifKategori) continue;
    const emojiler = arama
      ? kat.emojiler.filter((e) => katAd.toLowerCase().includes(arama) || e === arama)
      : kat.emojiler;
    if (arama && !emojiler.length && !katAd.toLowerCase().includes(arama)) continue;
    if (aktifKategori === 'hepsi') html += `<div class="kategori-baslik">${katAd}</div>`;
    html += emojiler.map((e) => `<div class="emoji-kutu" data-e="${e}">${e}</div>`).join('');
  }
  hedef.innerHTML = html || '<div class="kategori-baslik">—</div>';
  hedef.querySelectorAll('.emoji-kutu').forEach((k) => k.addEventListener('click', () => {
    seciliEmoji = k.dataset.e;
    $('#secili-emoji').textContent = seciliEmoji;
  }));
}

$('#emoji-ara').addEventListener('input', emojiListesiCiz);

$('#emoji-kopyala-btn').addEventListener('click', async () => {
  if (!seciliEmoji) return bildir(t('b_once_emoji_sec'), 'hata');
  try { await navigator.clipboard.writeText(seciliEmoji); bildir(t('b_kopyalandi') + seciliEmoji, 'ok'); }
  catch { bildir('❌', 'hata'); }
});

$('#emoji-gonder-btn').addEventListener('click', async () => {
  if (!seciliEmoji) return bildir(t('b_once_emoji_sec'), 'hata');
  const kime = $('#emoji-kime').value;
  if (!aktifDurumBagli()) return bildir(t('b_once_baglan'), 'hata');
  if (!kime) return bildir(t('b_once_kisi_sec'), 'hata');
  const btn = $('#emoji-gonder-btn');
  btn.disabled = true;
  try {
    const r = await fetch('/api/emoji-gonder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: seciliEmoji, kime }),
    }).then((x) => x.json());
    if (r.hata) throw new Error(r.hata);
    bildir(t('b_emoji_gonderildi') + seciliEmoji, 'ok');
  } catch (e) {
    bildir('❌ ' + e.message, 'hata');
  }
  btn.disabled = false;
});

/* ---------------- Baglanti butonlari ---------------- */
$('#baglanti-yenile').addEventListener('click', async () => {
  await fetch('/api/cikis', { method: 'POST' });
  bildir(t('b_yeni_qr'));
});

$('#baglanti-cikis').addEventListener('click', async () => {
  if (!confirm(t('b_oturum_sorusu'))) return;
  await fetch('/api/cikis', { method: 'POST' });
  bildir(t('b_oturum_kapandi'));
});

/* ---------------- Baslangic ---------------- */
kisileriYukle();
kutuphaneYukle();
dilUygula();
fetch('/api/durum').then((r) => r.json()).then((d) => {
  if (d.wa === 'bagli') {
    sonWaDurum = 'bagli';
    durumKutu.textContent = t('durum_bagli');
    durumKutu.className = 'durum-kutu bagli';
    kisileriYukle();
  }
});
