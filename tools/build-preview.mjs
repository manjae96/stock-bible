// 미리보기용 한 파일 만들기: node tools/build-preview.mjs
// index.html과 CSS·JS를 한 HTML 파일(dist/preview.html)로 합친다. 서비스 워커(PWA)는 끈다.
// dist/artifact.html 은 Claude 아티팩트 게시용(문서 골격 태그 없이).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html');

const css = read('css/app.css');
const jsFiles = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = jsFiles.map((f) => `/* ${f} */\n${read(f)}`).join('\n');
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'icons/icon-192.png')).toString('base64');

let out = html
  .replace(/<!--CSS-->[\s\S]*?<!--\/CSS-->/, `<style>\n${css}\n</style>`)
  .replace(/<!--JS-->[\s\S]*?<!--\/JS-->/, () => `<script>window.SB_NO_SW = true;</script>\n<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`)
  .replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}">`)
  .replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/preview.html'), out);

// 아티팩트용: <!doctype>, <html>, <head>, <body> 태그 제거
const headInner = out.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\n?/, '')
  .replace(/<meta name="viewport"[^>]*>\n?/, '');
const bodyInner = out.match(/<body>([\s\S]*?)<\/body>/)[1];
// 제목이 앞쪽 8KB 안에 오도록 title을 맨 앞에 둔다
const title = headInner.match(/<title>[\s\S]*?<\/title>/)[0];
const artifact = title + '\n' + headInner.replace(title, '') + '\n' + bodyInner;
fs.writeFileSync(path.join(root, 'dist/artifact.html'), artifact);
console.log('dist/preview.html', (out.length / 1024).toFixed(0) + 'KB · dist/artifact.html', (artifact.length / 1024).toFixed(0) + 'KB');
