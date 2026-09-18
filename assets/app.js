/* 北京求职看板 — 前端逻辑 */
(function () {
  "use strict";

  var DATA = null;
  var state = { tab: 1, subtab: "all", sort: "priority", only1h: false, q: "", showBatch2: false };

  var COLORS = { A: "#1f9d6b", B: "#e6a23c", C: "#d9534f" };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function load() {
    if (window.__DATA__) { DATA = window.__DATA__; init(); return; }
    fetch("./data/jobs.json?t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) { DATA = d; init(); })
      .catch(function (e) {
        el("joblist").innerHTML =
          '<div class="empty">⚠️ 数据加载失败，请确认已部署 data/jobs.json。<br>' + esc(e) + "</div>";
      });
  }

  function init() {
    var m = DATA.meta, c = m.candidate;
    el("heroTarget").textContent = c.target;
    el("heroAnchor").textContent = c.anchor;
    el("heroUpdated").textContent = "更新于 " + m.updated_at + " (" + m.timezone + ")";
    el("cnt1").textContent = m.tab1_count;
    el("cnt2").textContent = m.tab2_count;
    el("footNote").textContent = m.note;

    renderStats();
    bindControls();
    render();
  }

  function renderStats() {
    var jobs = DATA.jobs.filter(function (j) { return state.showBatch2 || j.batch !== 2; });
    var in1h = jobs.filter(function (j) { return j.within_1h; }).length;
    var avgMatch = Math.round(jobs.reduce(function (a, j) { return a + j.match; }, 0) / jobs.length);
    var t1 = jobs.filter(function (j) { return j.tab === 1; }).length;
    var t2 = jobs.filter(function (j) { return j.tab === 2; }).length;
    var stats = [
      { num: jobs.length, lbl: "在招岗位总数" },
      { num: t1 + " / " + t2, lbl: "本行业 / 跨行业" },
      { num: in1h, lbl: "位于 1 小时圈内" },
      { num: avgMatch + "%", lbl: "平均匹配度" }
    ];
    el("stats").innerHTML = stats.map(function (s) {
      return '<div class="stat"><div class="num">' + esc(s.num) + '</div><div class="lbl">' + esc(s.lbl) + "</div></div>";
    }).join("");
  }

  function currentJobs() {
    var list = DATA.jobs.filter(function (j) { return j.tab === state.tab; });
    if (state.tab === 2 && state.subtab !== "all") {
      list = list.filter(function (j) { return j.subtab === state.subtab; });
    }
    if (!state.showBatch2) list = list.filter(function (j) { return j.batch !== 2; });
    if (state.only1h) list = list.filter(function (j) { return j.within_1h; });
    if (state.q) {
      var q = state.q.toLowerCase();
      list = list.filter(function (j) {
        return (j.company + j.title + j.gap + j.skills.join(" ") + j.location).toLowerCase().indexOf(q) > -1;
      });
    }
    list.sort(function (a, b) {
      if (state.sort === "priority") return b.priority - a.priority;
      if (state.sort === "match") return b.match - a.match;
      if (state.sort === "salary") return (b.salary_max || 0) - (a.salary_max || 0);
      if (state.sort === "distance") return a.commute_min - b.commute_min;
      return 0;
    });
    return list;
  }

  function renderSubtabs() {
    var bar = el("subtabs");
    if (!bar) return;
    if (state.tab !== 2) { bar.style.display = "none"; bar.innerHTML = ""; return; }
    bar.style.display = "flex";
    var defs = [{ key: "all", name: "全部" }].concat(DATA.meta.subtabs || []);
    bar.innerHTML = defs.map(function (d) {
      var active = state.subtab === d.key ? " active" : "";
      return '<button class="subtab' + active + '" data-sub="' + d.key + '">' + esc(d.name) + "</button>";
    }).join("");
    Array.prototype.forEach.call(bar.querySelectorAll(".subtab"), function (b) {
      b.addEventListener("click", function () {
        state.subtab = b.getAttribute("data-sub");
        render();
      });
    });
  }

  function render() {
    renderSubtabs();
    var list = currentJobs();
    renderJobCards(list);
    renderCharts(list);
    updateLoadMore();
  }

  function updateLoadMore() {
    var wrap = el("loadMoreWrap");
    if (!wrap) return;
    // 计数跟随当前子 tab：若停在某个子 tab，只统计该子 tab 内的第二批岗位
    var hidden = DATA.jobs.filter(function (j) {
      return j.tab === state.tab && j.batch === 2 &&
        (state.tab !== 2 || state.subtab === "all" || j.subtab === state.subtab);
    }).length;
    if (state.showBatch2) {
      wrap.style.display = "block";
      el("loadMore").style.display = "none";
      el("allShown").style.display = "block";
    } else if (hidden > 0) {
      wrap.style.display = "block";
      el("loadMore").style.display = "inline-block";
      el("allShown").style.display = "none";
      el("moreCount").textContent = hidden;
    } else {
      wrap.style.display = "none";
    }
  }

  function renderJobCards(list) {
    if (!list.length) {
      el("joblist").innerHTML = '<div class="empty">没有符合筛选条件的岗位。</div>';
      return;
    }
    el("joblist").innerHTML = list.map(function (j) {
      var distCls = j.circle === "优" ? "dist" : (j.circle === "良" ? "dist warn" : "dist over");
      var skills = j.skills.map(function (s) { return '<span class="s">' + esc(s) + "</span>"; }).join("");
      var linkCls = j.link_ok ? "btn-link" : "btn-link dead";
      var linkTxt = j.link_ok ? "查看招聘链接 →" : "链接需复核";
      var deadNote = j.link_ok ? "" : '<span class="src">⚠ 链接暂不可达</span>';
      return '' +
        '<article class="job lv' + j.priority_level + '">' +
          '<div class="topline">' +
            '<div><h4>' + esc(j.title) + '</h4><div class="company">' + esc(j.company) + "</div></div>" +
            '<span class="pri ' + j.priority_level + '">优先级 ' + j.priority + " · " + j.priority_level + "</span>" +
          "</div>" +
          '<div class="tags">' +
            '<span class="tag">💰 ' + esc(j.salary_text) + "</span>" +
            '<span class="tag ' + distCls + '">🚇 约 ' + j.commute_min + " 分钟 · " + j.circle + "</span>" +
            '<span class="tag match">🎯 匹配度 ' + j.match + "%</span>" +
          "</div>" +
          '<div class="matchbar"><i style="width:' + j.match + '%"></i></div>' +
          '<div class="gap"><b>能力缺口：</b>' + esc(j.gap) + "</div>" +
          '<div class="skills">' + skills + "</div>" +
          (j.note ? '<div class="note">' + esc(j.note) + "</div>" : "") +
          '<div class="actions">' +
            '<a class="' + linkCls + '" href="' + esc(j.link) + '" target="_blank" rel="noopener"> ' + linkTxt + " </a>" +
            deadNote +
            '<span class="src">来源：' + esc(j.source) + " · " + esc(j.posted) + "</span>" +
          "</div>" +
        "</article>";
    }).join("");
  }

  var charts = {};
  function renderCharts(list) {
    if (typeof Chart === "undefined") return;
    var top = list.slice().sort(function (a, b) { return b.priority - a.priority; }).slice(0, 10);

    // Priority bar
    var barCtx = el("chartPriority");
    if (charts.bar) charts.bar.destroy();
    charts.bar = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: top.map(function (j) { return (j.company.length > 8 ? j.company.slice(0, 8) + "…" : j.company); }),
        datasets: [{
          label: "投递优先级",
          data: top.map(function (j) { return j.priority; }),
          backgroundColor: top.map(function (j) { return COLORS[j.priority_level]; })
        }]
      },
      options: {
        indexAxis: "y", responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { min: 0, max: 100 } }
      }
    });

    // Scatter: 匹配度 × 通勤
    var scCtx = el("chartScatter");
    if (charts.sc) charts.sc.destroy();
    charts.sc = new Chart(scCtx, {
      type: "scatter",
      data: {
        datasets: [
          { label: "A 级", data: list.filter(function (j) { return j.priority_level === "A"; })
              .map(function (j) { return { x: j.commute_min, y: j.match, t: j.title }; }), backgroundColor: COLORS.A },
          { label: "B 级", data: list.filter(function (j) { return j.priority_level === "B"; })
              .map(function (j) { return { x: j.commute_min, y: j.match, t: j.title }; }), backgroundColor: COLORS.B },
          { label: "C 级", data: list.filter(function (j) { return j.priority_level === "C"; })
              .map(function (j) { return { x: j.commute_min, y: j.match, t: j.title }; }), backgroundColor: COLORS.C }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: function (c) {
            return c.raw.t + "：通勤 " + c.raw.x + " 分 / 匹配 " + c.raw.y + "%";
          } } }
        },
        scales: {
          x: { title: { display: true, text: "潘家园单程通勤（分钟）" }, min: 0, max: 100 },
          y: { title: { display: true, text: "匹配度 (%)" }, min: 40, max: 100 }
        }
      }
    });

    // Distribution doughnut
    var distCtx = el("chartDist");
    if (charts.dn) charts.dn.destroy();
    var cnt = { A: 0, B: 0, C: 0 };
    list.forEach(function (j) { cnt[j.priority_level]++; });
    charts.dn = new Chart(distCtx, {
      type: "doughnut",
      data: {
        labels: ["A 级（优先投递）", "B 级（可考虑）", "C 级（备选/冲刺）"],
        datasets: [{ data: [cnt.A, cnt.B, cnt.C], backgroundColor: [COLORS.A, COLORS.B, COLORS.C] }]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    });
  }

  function bindControls() {
    Array.prototype.forEach.call(document.querySelectorAll("#tabs .tab"), function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("#tabs .tab").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state.tab = parseInt(btn.getAttribute("data-tab"), 10);
        state.subtab = "all";
        render();
      });
    });
    el("sort").addEventListener("change", function (e) { state.sort = e.target.value; render(); });
    el("only1h").addEventListener("change", function (e) { state.only1h = e.target.checked; render(); });
    el("search").addEventListener("input", function (e) { state.q = e.target.value.trim(); render(); });
    var lm = el("loadMore");
    if (lm) lm.addEventListener("click", function () { state.showBatch2 = true; render(); });
  }

  load();
})();
