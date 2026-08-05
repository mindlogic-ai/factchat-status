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
config["status-website"].customHeadHtml =
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">' +
  `<style>${css}</style><script>${js}</script>`;

writeFileSync(path, header + dump(config, { lineWidth: -1, noRefs: true }) + footer);
console.log(`customHeadHtml: ${config["status-website"].customHeadHtml.length} chars`);
