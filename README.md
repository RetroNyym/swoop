# 🐦➡️📱 Swoop

**Twitter'dan video/GIF indirip tek tıkla WhatsApp'a gönderen, içinde GIF / Sticker / Emoji kütüphanesi barındıran yerel program.**

Kuş (Twitter) süzülür, paketi telefonuna (WhatsApp) bırakır. 🪶

> ⚠️ Windows için tasarlanmıştır. Tamamen yerel çalışır — sunucu yok, bulut yok, veriler sizin bilgisayarınızda kalır.

---

## ✨ Özellikler

| | |
|---|---|
| 🐦 **Twitter İndirici** | Tweet (x.com) linkini yapıştır → video/GIF mp4 olarak iner. Kalite seçimi: En iyi / 720p / 480p |
| 📱 **WhatsApp Bağlantısı** | QR kod okut, bağlan. WhatsApp Web gibi çalışır, oturum kalıcıdır |
| 🚀 **Otomatik Gönderim** | "İndirince WhatsApp'a gönder" işaretle → seçtiğin kişiye/gruba anında gider |
| 📚 **Kütüphane** | İndirilen tüm medyalar tek ekranda; bilgisayarından dosya da ekleyebilirsin |
| ✨ **Sticker Üretici** | Herhangi bir resim/GIF → 512×512 WhatsApp sticker'ı (animasyonlu GIF'ler hareketli kalır) |
| 🎞 **GIF Gönderimi** | GIF'ler WhatsApp'ta GIF olarak oynar |
| 😀 **Emoji Kütüphanesi** | Kategorili arama; kopyala veya doğrudan sohbete gönder |

## 🚀 Kurulum

**Gereksinim:** [Node.js](https://nodejs.org) (18 veya üzeri)

```bash
git clone https://github.com/RetroNyym/swoop.git
cd swoop
npm install
node server.js
```

Ardından tarayıcıda **http://localhost:3560** adresini aç.

> **Windows'ta tek tık:** `Baslat.bat` çift tıkla (ilk açılışta paketleri otomatik kurar), kapatmak için `Kapat.bat`.
>
> İlk indirmede `yt-dlp` ve `ffmpeg` araçları otomatik indirilir (~100 MB, bir kez yapılır).

## 📱 WhatsApp'a Bağlanma

1. **WhatsApp Bağlantı** sekmesine geç
2. Telefonda **WhatsApp → Ayarlar → Bağlı Cihazlar → Cihaz Bağla**
3. QR kodu okut — tamam!

Bağlantı koparsa program 5 saniye sonra kendisi yeniden dener; QR okutma bir kez yeterlidir.

## 📦 Nasıl kullanılır

1. **Twitter İndir** sekmesine tweet linkini yapıştır (ör. `https://x.com/kullanici/status/123...`)
2. Kaliteyi seç; dilersen **"İndirince WhatsApp'a gönder"** işaretle
3. Kütüphanedeki öğelere: **📤 Gönder** · **✨ Sticker** · **🗑 Sil**
4. GIF/resimlerden tek tıkla sticker üret, stickerlar sekmesinden gönder

## ⚠️ Önemli Uyarı

Bu program resmi olmayan [Baileys](https://github.com/WhiskeySockets/Baileys) kütüphanesiyle WhatsApp Web protokolünü kullanır. WhatsApp **resmi olarak desteklemez** ve aşırı/istenmeyen mesaj gönderimi hesabın askıya alınmasına yol açabilir. **Kişisel ve makul kullanım** içindir; toplu SPAM aracı olarak kullanmayın. Sorumluluk kullanıcıya aittir.

## 🗂 Klasörler

| Klasör | İçerik |
|---|---|
| `data/indirilenler` | İndirilen/eklenen medyalar |
| `data/stickerlar` | Üretilen sticker'lar (webp) |
| `data/oturum` | WhatsApp oturum bilgisi *(asla paylaşmayın)* |
| `data/araclar` | yt-dlp ve ffmpeg |

## 🛠 Sorun Giderme

- **Sayfa açılmıyor:** `Baslat.bat` penceresindeki hataya bak; portu `PORT` ortam değişkeniyle değiştirebilirsin.
- **Tweet inmiyor:** Linkin video/GIF içerdiğinden emin ol (medyasız tweetlerde hata normaldir).
- **Oturumu sıfırlamak:** `data/oturum` klasörünü sil.

---

## English (short)

**Swoop** is a local web panel that downloads Twitter (x.com) videos & GIFs and sends them to WhatsApp, with a built-in GIF / Sticker / Emoji library. QR-based WhatsApp Web pairing, automatic send-after-download, one-click 512×512 sticker maker. Requires Node.js — see install steps above.

> Unofficial WhatsApp protocol (Baileys). For personal, reasonable use only — misuse may get your account banned.

---

Made with 🐦 by [@RetroNyym](https://github.com/RetroNyym) · MIT License
