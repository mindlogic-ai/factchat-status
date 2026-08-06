// assets/status-ui.{css,js} 를 .upptimerc.yml 의 customHeadHtml 로 인라인한다.
// Upptime 은 설정 파일만 읽으므로 소스는 따로 두고 여기서 합친다.
import { readFileSync, writeFileSync } from "fs";
import { load, dump } from "js-yaml";

const css = readFileSync("assets/status-ui.css", "utf8");
const js = readFileSync("assets/status-ui.js", "utf8");
const path = ".upptimerc.yml";
const raw = readFileSync(path, "utf8");
const header = raw.slice(0, raw.indexOf("owner:"));
const footer = raw.slice(raw.lastIndexOf("\n# --- 배포 대기"));

const config = load(raw);
const BASE = "https://mindlogic-ai.github.io/factchat-status";
const TITLE = "FactChat 서비스 상태";
const DESC =
  "팩트챗(FactChat) 서비스의 실시간 가동 상태와 과거 장애 이력. 웹앱·Chat API·게이트웨이·전용 클라우드(NCP)의 30일 가동률을 확인할 수 있습니다.";

// SEO/미리보기 메타. Upptime 은 title 외에 메타태그를 만들지 않아 여기서 넣는다.
// og:image 를 포함한 정적 파일은 assets/ 에 두면 사이트 루트로 복사된다
// (uptime-monitor src/site.ts:48 — `cp -r ../assets/* status-page/__sapper__/export`).
const meta = [
  `<meta name="description" content="${DESC}">`,
  `<link rel="canonical" href="${BASE}/">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="FactChat Status">`,
  `<meta property="og:locale" content="ko_KR">`,
  `<meta property="og:title" content="${TITLE}">`,
  `<meta property="og:description" content="${DESC}">`,
  `<meta property="og:url" content="${BASE}/">`,
  `<meta property="og:image" content="${BASE}/og.png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${TITLE}">`,
  `<meta name="twitter:description" content="${DESC}">`,
  `<meta name="twitter:image" content="${BASE}/og.png">`,
].join("");

// 템플릿이 <html lang=en> 을 하드코딩한다. Upptime 에 이를 바꾸는 설정이 없어
// 런타임에 교정한다 — JS 를 실행하는 크롤러에만 반영된다는 한계는 있다.
const langFix = `<script>document.documentElement.lang="ko";</script>`;

config["status-website"].customHeadHtml =
  meta +
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">' +
  `<style>${css}</style><script>${js}</script>` +
  langFix;

writeFileSync(path, header + dump(config, { lineWidth: -1, noRefs: true }) + footer);
console.log(`customHeadHtml: ${config["status-website"].customHeadHtml.length} chars`);
