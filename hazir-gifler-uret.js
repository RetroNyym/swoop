/* Swoop — Hazir GIF paketi uretici (ffmpeg ile) */
/* Kullanim: node hazir-gifler-uret.js  ->  hazir-gifler/ klasorune GIF'leri uretir */
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FF = path.join(__dirname, 'data', 'araclar', 'ffmpeg.exe');
const HEDEF = path.join(__dirname, 'hazir-gifler');
fs.mkdirSync(HEDEF, { recursive: true });

const FONT = 'C\\:/Windows/Fonts/segoeuib.ttf';

function uret(dosya, args) {
  const hedef = path.join(HEDEF, dosya);
  const tam = ['-y', '-hide_banner', '-loglevel', 'error', ...args, hedef];
  const r = spawnSync(FF, tam, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('HATA ' + dosya + ':', (r.stderr || '').slice(-300));
  } else {
    console.log('OK', dosya, fs.statSync(hedef).size, 'bayt');
  }
}

// ortak palet/loop kuyrugu (split'e baglanacak sekilde)
const PALET = "[a]palettegen=max_colors=128[p];[b][p]paletteuse[out]";

/* 1) Kalp nabzi (genu formulu, ates rengi, beyaz zemin) */
{
  const S = '(0.85+0.15*sin(2*PI*2.5*T))';
  const U = `(X-128)/(95*${S})`;
  const V = `(128-Y)/(95*${S})`;
  const F = `(${U}*${U}+${V}*${V}-1)*(${U}*${U}+${V}*${V}-1)*(${U}*${U}+${V}*${V}-1) - ${U}*${U}*${V}*${V}*${V}`;
  const IC = `lt(${F},0)`;
  uret('kalp-nabiz.gif', [
    '-f', 'lavfi', '-i', 'color=c=white:s=256x256:r=12:d=2',
    '-filter_complex', `[0:v]format=rgb24,geq=r='if(${IC},220,255)':g='if(${IC},25,255)':b='if(${IC},70,255)',split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse[out]`,
    '-map', '[out]', '-loop', '0',
  ]);
}

/* 2) Neon yuk halkasi (donen spinner, koyu zemin) */
{
  const D = 'hypot(X-128,Y-128)';
  const RING = `(gte(${D},58)*lte(${D},94))`;
  const PH = '(mod(atan2(128-Y,X-128)/(2*PI)-1.5*T+2,1))';
  const B = `pow(max(1-${PH},0),1.5)`;
  uret('neon-spinner.gif', [
    '-f', 'lavfi', '-i', 'color=c=0x0d0d16:s=256x256:r=12:d=2',
    '-filter_complex', `[0:v]format=rgb24,geq=r='if(${RING},255*${B},13)':g='if(${RING},90*${B},13)':b='if(${RING},240*${B},22)',split[a][b];${PALET}`,
    '-map', '[out]', '-loop', '0',
  ]);
}

/* 3) Yukleme cubugu (ilerleme bar, dongu) */
{
  const FILL = '(24+(208*mod(0.5*T,1)))';
  const IZ = '(gte(X,24)*lt(X,232)*gte(Y,108)*lt(Y,148))';
  uret('yukleme-bar.gif', [
    '-f', 'lavfi', '-i', 'color=c=white:s=256x256:r=12:d=2',
    '-filter_complex', `[0:v]format=rgb24,geq=r='if(${IZ},if(lt(X,${FILL}),40,225),255)':g='if(${IZ},if(lt(X,${FILL}),200,228),255)':b='if(${IZ},if(lt(X,${FILL}),90,235),255)',split[a][b];${PALET}`,
    '-map', '[out]', '-loop', '0',
  ]);
}

/* 4) Parilti (nabiz atan mor elmas) */
{
  const S = '(0.7+0.25*sin(2*PI*2*T))';
  const U = `(abs(X-128)/(90*${S}))`;
  const V = `(abs(Y-128)/(90*${S}))`;
  const IC = `lte(pow(${U},0.6667)+pow(${V},0.6667),1)`;
  uret('parilti.gif', [
    '-f', 'lavfi', '-i', 'color=c=white:s=256x256:r=12:d=2',
    '-filter_complex', `[0:v]format=rgb24,geq=r='if(${IC},150,255)':g='if(${IC},60,255)':b='if(${IC},220,255)',split[a][b];${PALET}`,
    '-map', '[out]', '-loop', '0',
  ]);
}

/* 5) Alarm (yanip sonen kirmizi nokta) */
{
  const DAIRE = 'lt((X-128)*(X-128)+(Y-128)*(Y-128),7744)';
  const ACIK = 'gt(sin(2*PI*2*T),0)';
  uret('alarm.gif', [
    '-f', 'lavfi', '-i', 'color=c=white:s=256x256:r=12:d=2',
    '-filter_complex', `[0:v]format=rgb24,geq=r='if(${ACIK},if(${DAIRE},235,255),255)':g='if(${ACIK},if(${DAIRE},40,255),255)':b='if(${ACIK},if(${DAIRE},40,255),255)',split[a][b];${PALET}`,
    '-map', '[out]', '-loop', '0',
  ]);
}

/* 6-10) Yazi GIF'leri */
function yaziGif(dosya, metin, renk, cizim) {
  uret(dosya, [
    '-f', 'lavfi', '-i', 'color=c=0x12121f:s=256x256:r=12:d=2',
    '-filter_complex', `[0:v]format=rgb24,drawtext=fontfile='${FONT}':text='${metin}':fontsize=72:fontcolor=${renk}:${cizim},split[a][b];${PALET}`,
    '-map', '[out]', '-loop', '0',
  ]);
}

yaziGif('lol.gif', 'LOL!', '0xffd23f', "x='(w-text_w)/2':y='128-36*abs(sin(2*PI*1.5*t))'");
yaziGif('ok.gif', 'OK!', '0x2ee06e', "x='(w-text_w)/2':y='(h-text_h)/2':alpha='0.55+0.45*abs(sin(2*PI*2*t))'");
yaziGif('wow.gif', 'WOW', '0xff5edb', "x='(w-text_w)/2+12*sin(2*PI*2*t)':y='(h-text_h)/2'");
yaziGif('hello.gif', 'HELLO!', '0x4fc3ff', "x='(w-text_w)/2':y='128-24*abs(sin(2*PI*t))'");
yaziGif('yuzde.gif', '100', '0xffb020', "x='(w-text_w)/2':y='(h-text_h)/2':alpha='0.6+0.4*abs(sin(2*PI*1.5*t))'");

console.log('Bitti:', fs.readdirSync(HEDEF).length, 'dosya');
