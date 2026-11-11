# 🐦➡️📱 Swoop

Twitter'dan video/GIF indiren, WhatsApp'a gönderen; ayrıca GIF / Sticker / Emoji kütüphanesi barındıran yerel program.

## 🚀 İlk Kurulum

1. **`Baslat.bat`** dosyasına çift tıkla.
   - İlk açılışta paketler otomatik kurulur (`npm install`).
   - Program ilk indirmede `yt-dlp` ve `ffmpeg` araçlarını `data/araclar` klasörüne otomatik indirir (~100 MB, bir kez yapılır).
2. Tarayıcıda panel açılır: **http://localhost:3560**
3. **📱 WhatsApp Bağlantı** sekmesine geç.
4. Telefonda **WhatsApp → Ayarlar → Bağlı Cihazlar → Cihaz Bağla** de ve QR kodu okut.
5. Hazır! Artık her şeyi gönderebilirsin.

## 🐦 Twitter İndirme

- Tweet linkini (x.com veya twitter.com) yapıştır.
- Kalite seç, isteğe bağlı **"İndirince WhatsApp'a gönder"** işaretle.
- İndirilen dosyalar **📚 Kütüphane**'de listelenir.

## 📚 Kütüphane & Sticker

- Kütüphanedeki her öğeye: **📤 Gönder** (WhatsApp'a), **✨ Sticker** (GIF/resimden 512×512 sticker üretir), **🗑 Sil**.
- Bilgisayarından kendi GIF/resim/videonu da ekleyebilirsin.
- GIF'ler WhatsApp'ta GIF olarak (hareketli) gönderilir.

## 😀 Emojiler

- Kategorili emoji kütüphanesi: seç → **Kopyala** veya **WhatsApp'a Gönder**.

## 📁 Klasörler

| Klasör | İçerik |
|---|---|
| `data/indirilenler` | İndirilen/eklenen medyalar |
| `data/stickerlar` | Üretilen sticker'lar (webp) |
| `data/oturum` | WhatsApp oturum bilgisi (silme → yeniden QR) |
| `data/araclar` | yt-dlp ve ffmpeg |

## ⚠️ Önemli Uyarılar

- Program resmi olmayan **Baileys** kütüphanesiyle WhatsApp Web protokolünü kullanır. Hesabın askıya alınma riski vardır; **aşırı toplu/istenmeyen mesaj göndermeyin**. Kişisel kullanım içindir.
- WhatsApp oturumu kapalıyken program açık kalırsa QR otomatik yenilenir; bağlantı koparsa 5 saniye sonra kendisi tekrar dener.
- Program açıkken telefonun internete bağlı olması gerekir (WhatsApp Web kuralı).

## 🛠 Sorun Giderme

- **Sayfa açılmıyor:** `Baslat.bat` penceresinde hata var mı bak; portu başka program kullanıyor olabilir (`PORT` ortam değişkeniyle değiştirilebilir).
- **QR gelmiyor:** `Kapat.bat` çalıştır, sonra tekrar `Baslat.bat`.
- **Tweet inmiyor:** Linkin bir video/GIF içerdiğinden emin ol; medya olmayan tweetlerde "İndirilen dosya bulunamadı" hatası normaldir.
- **Oturumu sıfırlamak için:** `data/oturum` klasörünü sil.
