/*! Copyright (c) 2026 Free Life. All rights reserved. Unauthorized copying, re-hosting or redistribution of this code is prohibited. */
(() => {
  "use strict";
  const VERSION = 1;
  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
  const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const call = (fn, ...args) => { try { return typeof fn === "function" ? fn(...args) : undefined; } catch (e) { console.warn("[life-admin]", e); } };
  const data = () => (state.lifeAdmin ||= { v: VERSION, god: false, rival: null, used: {} });
  const statNames = ["Happiness", "Health", "Smarts", "Looks"];

  function relationshipRows() {
    const exes = (state.exes || []).filter((p) => p && !p.dead && p.first);
    const friends = (state.friends || []).filter((p) => p && !p.dead && p.first);
    return [...new Set([...exes, ...friends])];
  }
  function openStories() {
    if (typeof sTitle === "undefined" || typeof sList === "undefined") return;
    sTitle.textContent = "PEOPLE & STORIES";
    if (typeof sSub !== "undefined") sSub.style.display = "none";
    if (typeof sBack !== "undefined") {
      sBack.innerHTML = typeof BACK_ICON !== "undefined" ? BACK_ICON : "‹";
      sBack.onclick = () => call(window.openRelationships);
    }
    const r = data().rival;
    const people = relationshipRows();
    let html = '<div class="sec">Recurring rival</div>';
    html += r && r.person && !r.person.dead
      ? `<div class="row" id="laRival"><img src="emoji/1f624.png"><div class="t"><b>${esc(r.person.first)} ${esc(r.person.last || "")}</b><span>${esc(r.kind || "Rival")} · rivalry ${clamp(r.score, 0, 100)}%</span></div>${typeof DOTS !== "undefined" ? DOTS : ""}</div>`
      : '<div class="row dis"><img src="emoji/1f50e.png"><div class="t"><b>No rival yet</b><span>A familiar face may become a rival as your life unfolds.</span></div></div>';
    html += '<div class="sec">Exes &amp; old friends</div>';
    html += people.length ? people.map((p, i) => {
      const isEx = (state.exes || []).includes(p);
      return `<div class="row" data-la-person="${i}"><img src="${isEx ? "emoji/1f494.png" : "emoji/1f465.png"}"><div class="t"><b>${esc(p.first)} ${esc(p.last || "")}</b><span>${isEx ? `Ex · broke up at age ${p.exAt ?? "?"}` : "Friend"} · relationship ${clamp(p.rel ?? 50)}%</span></div>${typeof DOTS !== "undefined" ? DOTS : ""}</div>`;
    }).join("") : '<div class="row dis"><img src="emoji/1f4ad.png"><div class="t"><b>No one here yet</b><span>Past relationships and friends will show up here.</span></div></div>';
    sList.innerHTML = html;
    const rival = document.getElementById("laRival");
    if (rival) rival.onclick = () => rivalCard();
    sList.querySelectorAll("[data-la-person]").forEach((el) => el.onclick = () => personCard(people[Number(el.dataset.laPerson)]));
    sList.scrollTop = 0;
  }
  function personCard(p) {
    if (!p) return openStories();
    const ex = (state.exes || []).includes(p);
    const name = `${p.first} ${p.last || ""}`.trim();
    const choices = [];
    if (ex) {
      choices.push(["Send a message", () => talkToEx(p)]);
      if (state.age >= 16 && (p.age == null || p.age >= 16)) choices.push(["Meet up", () => meetEx(p)]);
      const single = !(state.spouse && !state.spouse.dead) && !(state.lovers || []).some((x) => x && !x.dead);
      if (single) choices.push(["Ask to get back together", () => reconcile(p)]);
    } else choices.push(["Continue", openStories]);
    choices.push(["Back", openStories]);
    jCard({
      tag: ex ? "Ex" : "Friend",
      person: { name, look: p.look, g: p.g || p.gender, age: typeof loverAge === "function" ? loverAge(p) : p.age, mood: ex ? "sad" : "happy" },
      iconSrc: ex ? "emoji/1f494.png" : "emoji/1f465.png",
      title: name,
      rows: [["Relationship", `${clamp(p.rel ?? 50)}%`], ...(ex ? [["Broke up at age", p.exAt ?? "Unknown"]] : [])],
      lead: ex ? `${name} is part of your past, but you can still reach out and see where things go.` : `${name} is still in your life.`,
      choices,
    });
  }
  function once(p, action) {
    const d = data();
    d.used[action] ||= {};
    if (d.used[action][p.first] === state.age) return false;
    d.used[action][p.first] = state.age;
    return true;
  }
  function pronouns(p) {
    const f = (p.g || p.gender) === "f";
    return { he: f ? "she" : "he", him: f ? "her" : "him", He: f ? "She" : "He" };
  }
  function talkToEx(p) {
    if (!once(p, "talk")) return notice("Already reached out", `You already contacted ${esc(p.first)} this year.`, null, true);
    const gain = ri(1, p.rel >= 60 ? 6 : 3);
    p.rel = clamp((p.rel ?? 50) + (Math.random() < 0.68 ? gain : -ri(1, 4)));
    const good = p.rel >= (p.lastContactRel || 50);
    p.lastContactRel = p.rel;
    const line = good ? `${p.first} replied. You caught up about old memories and what's changed.` : `${p.first} kept the conversation brief. It may be too soon.`;
    call(say, `I messaged my ex, ${p.first}.`);
    renderStats();
    notice("A message to your ex", line, openStories, true, `<div class="ev-bars nb"><b>Relationship</b><i><u style="width:${Math.max(1, p.rel)}%;background:${typeof barCol === "function" ? barCol(p.rel) : "#4a9"}"></u></i></div>`);
  }
  function meetEx(p) {
    if (!once(p, "meet")) return notice("Already met", `You already met ${esc(p.first)} this year.`, null, true);
    const chance = Math.max(0.12, Math.min(0.88, 0.18 + (p.rel ?? 50) / 150));
    const success = Math.random() < chance;
    p.rel = clamp((p.rel ?? 50) + (success ? ri(5, 12) : -ri(2, 8)));
    call(say, `I met up with my ex, ${p.first}.`);
    renderStats();
    notice(success ? "A good catch-up" : "Awkward catch-up", success ? `You and ${p.first} had a surprisingly good time. Maybe there's still a connection.` : `${p.first} said it was nice to see you, but things still feel complicated.`, openStories, true);
  }
  function reconcile(p) {
    if (state.spouse && !state.spouse.dead || (state.lovers || []).some((x) => x && !x.dead))
      return notice("Already with someone", "End your current relationship before asking your ex to try again.", null, true);
    if (state.age < 16 || (typeof loverAge === "function" && loverAge(p) < 16)) return notice("Too young", "You both need to be at least 16 to consider dating again.", null, true);
    const odds = Math.max(0.05, Math.min(0.85, 0.12 + (p.rel ?? 50) / 140 - (p.discoveredCheating ? 0.25 : 0)));
    if (Math.random() < odds) {
      const i = (state.exes || []).indexOf(p);
      if (i >= 0) state.exes.splice(i, 1);
      p.rel = Math.max(60, clamp(p.rel ?? 60));
      delete p.exAt;
      const msg = typeof addLover === "function" ? addLover(p) : "";
      state.stats.Happiness = clamp((state.stats.Happiness || 0) + ri(5, 12));
      renderStats();
      call(say, `I got back together with ${p.first} ${p.last || ""}.`);
      notice("A second chance", `${p.first} agreed to try again. Take it slowly and rebuild trust.${msg || ""}`, openStories, true);
    } else {
      p.rel = clamp((p.rel ?? 50) - ri(2, 7));
      call(say, `I asked ${p.first} to get back together, but they weren't ready.`);
      renderStats();
      notice("Not ready yet", `${p.first} isn't ready to restart the relationship. You can keep things friendly and try again another year.`, openStories, true);
    }
  }
  function rivalCard() {
    const r = data().rival;
    if (!r || !r.person) return openStories();
    const p = r.person;
    jCard({
      tag: "Rival",
      person: { name: `${p.first} ${p.last || ""}`.trim(), look: p.look, g: p.g, age: state.age + (p.ageOffset || 0), mood: "angry" },
      iconSrc: "emoji/1f624.png",
      title: `Your ${r.kind || "Rival"}`,
      lead: `${p.first} has been a familiar competitor since age ${r.metAt}. Your rivalry score is ${clamp(r.score, 0, 100)}%. You can turn the competition into respect—or make it personal.`,
      rows: [["Relationship", `${clamp(p.rel ?? 45)}%`], ["Rivalry", `${clamp(r.score, 0, 100)}%`], ["First met", `Age ${r.metAt}`]],
      choices: [["Let the rivalry play out", openStories]],
    });
  }
  function makeRival() {
    const age = state.age;
    let p = null;
    const classmates = state.school && Array.isArray(state.school.classmates) ? state.school.classmates.filter((x) => x && x.first && !x.dead) : [];
    if (classmates.length) p = pick(classmates);
    if (!p) {
      const g = Math.random() < 0.5 ? "m" : "f";
      p = { first: typeof uname === "function" ? uname(g) : "Jordan", last: typeof any === "function" && Array.isArray(LAST) ? any(LAST) : "Reed", g, ageOffset: 0, rel: ri(25, 55), look: typeof randomLook === "function" ? randomLook(g, age) : {} };
    }
    const d = data();
    d.rival = { person: p, metAt: age, score: ri(20, 45), kind: age < 18 ? "School rival" : state.job ? "Work rival" : "Local rival", lastEvent: age, wins: 0, losses: 0 };
    jCard({ tag: "A new rivalry", person: { name: `${p.first} ${p.last || ""}`.trim(), look: p.look, g: p.g, age: age + (p.ageOffset || 0), mood: "angry" }, iconSrc: "emoji/1f3c6.png", title: "A familiar competitor", lead: `${p.first} always seems to be chasing the same things you are. You can compete, become friends, or let the rivalry fade.`, choices: [["Bring it on", () => { d.rival.score = clamp(d.rival.score + 8); openStories(); }], ["Keep it friendly", () => { p.rel = clamp((p.rel ?? 45) + 10); d.rival.score = clamp(d.rival.score - 8); openStories(); }]] });
  }
  function rivalYear() {
    if (state.dead || state.prison || state.age < 8) return;
    const d = data();
    if (!d.rival && state.age <= 65 && Math.random() < 0.12) return makeRival();
    const r = d.rival;
    if (!r || !r.person || r.person.dead || state.age - (r.lastEvent ?? r.metAt) < 2 || Math.random() > 0.22) return;
    r.lastEvent = state.age;
    const p = r.person;
    const kind = state.age < 18 ? "school" : state.job ? "work" : "life";
    const situation = kind === "school" ? `${p.first} scored higher than you on a major exam and won't stop talking about it.` : kind === "work" ? `${p.first} is competing with you for a promotion that could change your career.` : `${p.first} got the opportunity you were hoping for, and people are comparing you again.`;
    jCard({ tag: "Rival", person: { name: `${p.first} ${p.last || ""}`.trim(), look: p.look, g: p.g, age: state.age + (p.ageOffset || 0), mood: "angry" }, iconSrc: "emoji/1f3c6.png", title: "The rivalry continues", lead: `${situation}<br><br>How do you respond?`, bars: [["Relationship", p.rel ?? 45]], choices: [
      ["Outwork them", () => { r.score = clamp(r.score + ri(6, 12)); r.wins = (r.wins || 0) + 1; p.rel = clamp((p.rel ?? 45) - ri(1, 5)); if (state.job) state.job.perf = clamp((state.job.perf ?? 50) + 5); else state.stats.Smarts = clamp((state.stats.Smarts ?? 50) + 2); call(say, `I pushed myself to outperform ${p.first}.`); renderStats(); }],
      ["Congratulate them", () => { r.score = clamp(r.score - ri(4, 9)); p.rel = clamp((p.rel ?? 45) + ri(5, 10)); state.stats.Happiness = clamp((state.stats.Happiness ?? 50) + 2); call(say, `I congratulated ${p.first} instead of turning it into a fight.`); renderStats(); }],
      ["Try to sabotage them", () => { if (Math.random() < 0.35) { r.score = clamp(r.score + 12); p.rel = clamp((p.rel ?? 45) - 12); call(say, `I quietly undermined ${p.first}.`); } else { r.score = clamp(r.score - 10); p.rel = clamp((p.rel ?? 45) - 15); state.stats.Happiness = clamp((state.stats.Happiness ?? 50) - 3); call(say, `${p.first} found out I tried to undermine them.`); } renderStats(); }],
    ] });
  }
  function allPeople() {
    return [...(state.parents || []), ...(state.family || []), ...(state.friends || []), ...(state.lovers || []), ...(state.exes || []), state.spouse].filter((p, i, a) => p && !p.dead && a.indexOf(p) === i);
  }
  function applyGod() {
    if (!state || state.dead) return;
    statNames.forEach((k) => { if (state.stats) state.stats[k] = 100; });
    state.money = Math.max(Number(state.money) || 0, 999999999);
    if (state.job) state.job.perf = 100;
    if (state.mind && typeof state.mind === "object") { state.mind.mh = 100; state.mind.stress = 0; }
    if (state.stats) state.stats["Mental Health"] = 100;
    if (state.art) state.art.fame = Math.max(Number(state.art.fame) || 0, 100);
    for (const p of allPeople()) if (typeof p.rel === "number") p.rel = 100;
    for (const account of Object.values(state.social || {})) if (account && typeof account === "object") {
      if (typeof account.subs === "number") account.subs = Math.max(account.subs, 1000000);
      if (typeof account.followers === "number") account.followers = Math.max(account.followers, 1000000);
    }
    renderStats();
  }
  function askNumber(title, current, onSet, min = 0, max = 1000000000) {
    const raw = prompt(`${title} (${min}–${max})`, String(current));
    if (raw == null) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return notice("Invalid number", "Enter a valid number and try again.", null, true);
    onSet(Math.max(min, Math.min(max, Math.round(n))));
    renderStats();
  }
  function openAdmin() {
    const d = data();
    const actions = [
      [d.god ? "Turn God Mode off" : "Turn God Mode on", () => { d.god = !d.god; if (d.god) applyGod(); notice("God Mode", d.god ? "Enabled: core stats, money, relationships, fame, social followers, and job performance are maxed each year." : "Disabled. Your current values stay as they are.", openAdmin, true); }],
      ["Max all core stats now", () => { statNames.forEach((k) => state.stats[k] = 100); renderStats(); notice("Stats maxed", "Happiness, Health, Smarts, and Looks are now 100.", openAdmin, true); }],
      ["Edit a core stat", () => socSelCard({ icon: "emoji/2699-fe0f.png", title: "Edit a stat", lead: "Choose a stat, then enter its value.", label: "Stat:", opts: statNames, btn: "Choose", onGo: (i) => { const k = statNames[i]; askNumber(k, state.stats[k], (n) => { state.stats[k] = n; }, 0, 100); setTimeout(openAdmin, 60); } })],
      ["Set money", () => askNumber("Set bank balance", state.money || 0, (n) => { state.money = n; }, 0, 999999999999)],
      ["Set social followers", () => askNumber("Set followers for every account", 1000000, (n) => { for (const a of Object.values(state.social || {})) if (a && typeof a === "object") { if (typeof a.subs === "number") a.subs = n; if (typeof a.followers === "number") a.followers = n; } }, 0, 999999999999)],
      ["Max all relationships", () => { for (const p of allPeople()) if (typeof p.rel === "number") p.rel = 100; renderStats(); notice("Relationships maxed", "Everyone in your current life is now at 100 relationship.", openAdmin, true); }],
      ["Set job performance to 100", () => { if (state.job) state.job.perf = 100; renderStats(); notice("Career boosted", state.job ? "Your current job performance is 100." : "You do not have a current job.", openAdmin, true); }],
      ["Set age", () => askNumber("Set character age", state.age || 0, (n) => { state.age = n; renderStats(); }, 0, 120)],
      ["Back to Relationships", () => call(window.openRelationships)],
    ];
    jCard({ tag: "Admin Toolkit", iconSrc: "emoji/2699-fe0f.png", title: "God Mode & Admin", lead: "Single-player controls for your local save. God Mode keeps your life maxed every year; individual tools let you edit values whenever you want.", rows: [["God Mode", d.god ? "ON" : "OFF"], ["Money", typeof usd === "function" ? usd(state.money || 0) : String(state.money || 0)], ["Social accounts", String(Object.keys(state.social || {}).length)]], choices: actions });
  }
  function addMenuRow() {
    if (typeof window.openRelationships !== "function" || window.openRelationships.__lifeAdminWrapped) return;
    const original = window.openRelationships;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      try {
        if (typeof sTitle === "undefined" || !sTitle || sTitle.textContent !== "RELATIONSHIPS" || !sList) return result;
        if (!document.getElementById("laStoriesRow")) {
          sList.insertAdjacentHTML("beforeend", '<div class="sec">More</div><div class="row" id="laStoriesRow"><img src="emoji/1f4ac.png"><div class="t"><b>Rivals &amp; exes</b><span>Storylines, catch-ups, and second chances</span></div></div><div class="row" id="laAdminRow"><img src="emoji/2699-fe0f.png"><div class="t"><b>God Mode / Admin</b><span>Edit stats, money, social followers, and more</span></div></div>');
          document.getElementById("laStoriesRow").onclick = openStories;
          document.getElementById("laAdminRow").onclick = openAdmin;
        }
      } catch (e) { console.warn("[life-admin] menu", e); }
      return result;
    };
    wrapped.__lifeAdminWrapped = true;
    window.openRelationships = wrapped;
  }
  function boot() {
    if (typeof state === "undefined" || typeof jCard !== "function" || !document.getElementById("ageBtn") || typeof window.openRelationships !== "function") return setTimeout(boot, 100);
    if (window.FL_LIFE_ADMIN) return;
    if (!state.lifeAdmin || state.lifeAdmin.v !== VERSION) state.lifeAdmin = { v: VERSION, god: false, rival: null, used: {} };
    addMenuRow();
    document.getElementById("ageBtn").addEventListener("click", () => setTimeout(() => {
      try {
        const d = data();
        if (d.god && !state.dead) applyGod();
        rivalYear();
      } catch (e) { console.warn("[life-admin] yearly", e); }
    }, 850));
    window.FL_LIFE_ADMIN = { state: data, openStories, openAdmin, applyGod };
    console.log("[life-admin] loaded");
  }
  boot();
})();
