/* FactChat Status — Upptime 이 제공하지 않는 두 가지를 채운다.
   1) 컴포넌트별 30일 가동률 막대 (history/daily.json — daily-uptime.mjs 가 생성)
   2) 모니터가 하나라도 정상이 아닐 때 상단 경고 배너
   Upptime 은 클라이언트에서 목록을 렌더하므로 DOM 이 준비될 때까지 폴링한다. */
(function () {
  var OWNER = "mindlogic-ai",
    REPO = "factchat-status",
    RAW = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/master";
  var daily = null;

  fetch(RAW + "/history/daily.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { daily = j; })
    .catch(function () { daily = null; });

  function slugOf(article) {
    var a = article.querySelector('a[href*="/history/"]');
    if (!a) return null;
    var m = /\/history\/([^/?#]+)/.exec(a.getAttribute("href") || "");
    return m ? m[1] : null;
  }

  function barClass(d) {
    if (!d || d.uptime === null) return "";           // 데이터 없는 날은 회색으로 둔다
    if (d.uptime >= 99.5) return "up";
    if (d.uptime >= 90) return "partial";
    return "down";
  }

  function renderBars(article, slug) {
    if (!daily || !daily.sites || !daily.sites[slug]) return;
    if (article.querySelector(".fc-bars")) return;
    var days = daily.sites[slug];
    var withData = days.filter(function (d) { return d.checks > 0; });
    var avg = withData.length
      ? withData.reduce(function (s, d) { return s + d.uptime; }, 0) / withData.length
      : null;

    var bars = document.createElement("div");
    bars.className = "fc-bars";
    days.forEach(function (d) {
      var b = document.createElement("div");
      b.className = "fc-bar " + barClass(d);
      b.title = d.checks
        ? d.date + " · 가동률 " + d.uptime + "% (" + d.checks + "회 점검)"
        : d.date + " · 데이터 없음";
      bars.appendChild(b);
    });

    var scale = document.createElement("div");
    scale.className = "fc-scale";
    scale.innerHTML =
      "<span>30일 전</span><span class='fc-rule'></span><span>" +
      (avg === null ? "데이터 수집 중" : Math.round(avg * 100) / 100 + "% 가동") +
      "</span><span class='fc-rule'></span><span>오늘</span>";

    article.appendChild(bars);
    article.appendChild(scale);

    // 수집 기간이 30일 미만이면 그렇게 밝힌다. 빈 막대를 장애로 오해하지 않도록.
    if (withData.length < days.length) {
      var note = document.createElement("div");
      note.className = "fc-legend-note";
      note.textContent = "가동 이력 " + withData.length + "일 누적 — 회색은 수집 전 기간입니다";
      article.appendChild(note);
    }
  }

  function renderDot(article) {
    var h4 = article.querySelector("h4");
    if (!h4 || h4.querySelector(".fc-dot")) return;
    var state = article.classList.contains("down")
      ? "down"
      : article.classList.contains("degraded")
      ? "degraded"
      : "up";
    var dot = document.createElement("span");
    dot.className = "fc-dot " + state;
    dot.textContent = state === "up" ? "✓" : "!";
    dot.setAttribute("aria-label", state === "up" ? "정상" : state === "down" ? "장애" : "성능 저하");
    h4.appendChild(dot);
  }

  function renderAlert(articles) {
    var down = 0, degraded = 0;
    articles.forEach(function (a) {
      if (a.classList.contains("down")) down++;
      else if (a.classList.contains("degraded")) degraded++;
    });
    var existing = document.getElementById("fc-alert");
    if (!down && !degraded) { if (existing) existing.remove(); return; }

    // 문제가 있으면 Upptime 의 "모두 정상" 배너는 사실과 다르므로 숨긴다
    var ok = document.querySelector("article.up:not(.link)");
    if (ok) ok.style.display = "none";

    var el = existing || document.createElement("div");
    el.id = "fc-alert";
    el.className = down ? "down" : "degraded";
    el.innerHTML =
      "<span>" +
      (down ? "서비스 " + down + "개 장애" : "서비스 " + degraded + "개 성능 저하") +
      "</span><span class='fc-alert-sub'>아래 목록에서 영향 범위를 확인하세요</span>";
    if (!existing) {
      var anchor = document.querySelector("section.live-status");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor);
    }
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var articles = [].slice.call(document.querySelectorAll("section.live-status article"));
    if (articles.length) {
      articles.forEach(function (a) {
        renderDot(a);
        var s = slugOf(a);
        if (s) renderBars(a, s);
      });
      renderAlert(articles);
      // daily.json 이 늦게 오면 막대만 다시 그린다
      if (daily || tries > 40) clearInterval(timer);
    }
    if (tries > 75) clearInterval(timer);
  }, 400);
})();
