// history/<slug>.yml 의 커밋 이력에서 일자별 가동률을 계산해 history/daily.json 으로 쓴다.
// Upptime 은 일자별 가동률 막대에 쓸 데이터를 만들지 않는다.
//
// 🚨 커밋은 "점검 1회"가 아니다. Upptime 의 5분 주기 `update` 는 상태가 *바뀔 때만* 커밋한다
// (uptime-monitor src/update.ts: `if (shouldCommit || currentStatus !== status)`).
// 무조건 커밋하는 건 하루 한 번 도는 `response-time` 뿐이다.
// 따라서 커밋을 세면 안 되고, 커밋을 *상태 전이점*으로 보고 구간을 복원해 시간 가중으로
// 계산해야 한다. 안 그러면 장애 없이 조용한 날이 "점검 0회 → 회색"으로 나온다.
import { execSync } from "child_process";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { load } from "js-yaml";

const DAYS = 90; // 공개 status page 관례(Atlassian Statuspage 기본 90일)에 맞춘다
const DAY_MS = 86400000;

const slugs = readdirSync("history")
  .filter((f) => f.endsWith(".yml"))
  .map((f) => f.replace(/\.yml$/, ""));

const now = new Date();
const window = [...Array(DAYS)].map((_, i) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - (DAYS - 1 - i));
  return d.toISOString().slice(0, 10);
});

/** 커밋 로그에서 (시각, 상태) 전이점을 오래된 순으로 뽑는다. */
function transitions(slug) {
  let log = "";
  try {
    log = execSync(
      `git log --reverse --format='#COMMIT#%cI' -p --since='${DAYS + 2} days ago' -- history/${slug}.yml`,
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
  } catch {
    return [];
  }
  const points = [];
  let when = null;
  for (const line of log.split("\n")) {
    // 마커를 '@' 로 두면 diff hunk 헤더(@@ -1,7 +1,7 @@)가 커밋 구분자로 잡힌다.
    if (line.startsWith("#COMMIT#")) {
      when = new Date(line.slice(8));
      continue;
    }
    // 상태가 안 바뀐 커밋에서는 status 가 context 줄(' status: up')로 나온다. 삭제줄만 제외.
    const m = /^[ +]status:\s*(\w+)/.exec(line);
    if (!m || !when) continue;
    points.push({ at: when, status: m[1] });
    when = null; // 커밋당 한 점만
  }
  return points;
}

/** 현재 파일의 상태 — 마지막 구간을 now 까지 잇는 데 쓴다. */
function currentStatus(slug) {
  try {
    return load(readFileSync(`history/${slug}.yml`, "utf8")).status || null;
  } catch {
    return null;
  }
}

const out = {};
for (const slug of slugs) {
  const points = transitions(slug);
  if (!points.length) {
    out[slug] = window.map((date) => ({ date, uptime: null, seconds: 0 }));
    continue;
  }

  // 전이점을 구간으로: [t_i, t_{i+1}) 동안 상태는 s_i. 마지막 구간은 지금까지.
  const last = currentStatus(slug) || points[points.length - 1].status;
  const spans = points.map((p, i) => ({
    from: p.at,
    to: i + 1 < points.length ? points[i + 1].at : now,
    status: i + 1 < points.length ? p.status : last,
  }));
  const observedFrom = points[0].at; // 그 이전은 관측 자체가 없다 → 회색

  const perDay = {};
  for (const span of spans) {
    let cursor = span.from.getTime();
    const end = span.to.getTime();
    while (cursor < end) {
      const date = new Date(cursor).toISOString().slice(0, 10);
      const dayEnd = Date.parse(`${date}T00:00:00Z`) + DAY_MS;
      const chunkEnd = Math.min(end, dayEnd);
      const seconds = (chunkEnd - cursor) / 1000;
      perDay[date] = perDay[date] || { up: 0, total: 0 };
      perDay[date].total += seconds;
      if (span.status === "up") perDay[date].up += seconds;
      cursor = chunkEnd;
    }
  }

  out[slug] = window.map((date) => {
    const d = perDay[date];
    const dayStart = Date.parse(`${date}T00:00:00Z`);
    if (dayStart + DAY_MS <= observedFrom.getTime() || !d || !d.total)
      return { date, uptime: null, seconds: 0 };
    return {
      date,
      uptime: Math.round((d.up / d.total) * 10000) / 100,
      seconds: Math.round(d.total),
    };
  });
}

writeFileSync(
  "history/daily.json",
  JSON.stringify({ generatedAt: now.toISOString(), days: DAYS, sites: out }, null, 2)
);
const filled = Object.values(out)
  .flat()
  .filter((d) => d.seconds).length;
console.log(`daily.json: ${Object.keys(out).length} sites, ${filled} day-buckets with coverage`);
