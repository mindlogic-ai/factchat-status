// history/<slug>.yml 의 커밋 이력에서 일자별 가동률을 계산해 history/daily.json 으로 쓴다.
// Upptime 은 30일 막대에 쓸 데이터를 만들지 않는다 — 매 체크마다 history 파일을 커밋할 뿐이라
// 그 커밋 로그가 사실상 유일한 시계열 소스다.
import { execSync } from "child_process";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { load } from "js-yaml";

const DAYS = 30;
const config = load(readFileSync(".upptimerc.yml", "utf8"));
const slugs = readdirSync("history")
  .filter((f) => f.endsWith(".yml"))
  .map((f) => f.replace(/\.yml$/, ""));

const dayKey = (iso) => iso.slice(0, 10);
const today = new Date();
const window = [...Array(DAYS)].map((_, i) => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - (DAYS - 1 - i));
  return d.toISOString().slice(0, 10);
});

const out = {};
for (const slug of slugs) {
  // 커밋별 status 를 한 번의 git log 로 뽑는다. 파일마다 git show 를 도는 것보다 훨씬 싸다.
  let log = "";
  try {
    log = execSync(
      `git log --format='#COMMIT#%cI' -p --since='${DAYS + 1} days ago' -- history/${slug}.yml`,
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
  } catch {
    continue;
  }
  const perDay = {};
  let when = null;
  for (const line of log.split("\n")) {
    // 마커를 '@' 로 두면 diff 의 hunk 헤더(@@ -1,7 +1,7 @@)까지 커밋 구분자로 잡혀
    // 모든 상태가 엉뚱한 날짜 키에 들어간다. 충돌하지 않는 마커를 쓴다.
    if (line.startsWith("#COMMIT#")) {
      when = dayKey(line.slice(8));
      continue;
    }
    // 상태가 안 바뀐 커밋에서는 status 가 context 줄(' status: up')로 나온다.
    // '+' 만 보면 상태 변경 시점만 잡혀 거의 전부 누락된다. 삭제줄('-')만 제외한다.
    const m = /^[ +]status:\s*(\w+)/.exec(line);
    if (!m || !when) continue;
    perDay[when] = perDay[when] || { up: 0, total: 0 };
    perDay[when].total += 1;
    if (m[1] === "up") perDay[when].up += 1;
  }
  out[slug] = window.map((date) => {
    const d = perDay[date];
    if (!d || !d.total) return { date, uptime: null, checks: 0 };
    return {
      date,
      uptime: Math.round((d.up / d.total) * 10000) / 100,
      checks: d.total,
    };
  });
}

writeFileSync(
  "history/daily.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), days: DAYS, sites: out }, null, 2)
);
console.log(
  `daily.json: ${Object.keys(out).length} sites, ` +
    `${Object.values(out).flat().filter((d) => d.checks).length} days with data`
);
