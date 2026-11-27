/* Advanced Admin Controls for YourLife — local, single-player save editor. */
(() => {
  "use strict";
  if (window.FL_ADMIN_PLUS) return;

  const ICON = "emoji/2699-fe0f.png";
  const MAX_MONEY = 999999999999999;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const bounded = (value, min, max) => Math.max(min, Math.min(max, Math.round(Number(value))));
  const formatMoney = (value) => typeof usd === "function" ? usd(value || 0) : "$" + Math.round(value || 0).toLocaleString();
  const tell = (title, message, back) => {
    if (typeof notice === "function") notice(title, message, back || openAdvanced, true);
  };
  const save = () => {
    try {
      if (typeof renderStats === "function") renderStats();
      if (typeof window.blSaveLife === "function") Promise.resolve(window.blSaveLife()).catch((e) => console.warn("[admin-plus] save", e));
    } catch (e) { console.warn("[admin-plus] save", e); }
  };
  const card = (options) => {
    if (typeof jCard === "function") jCard({ tag: "Advanced Admin", iconSrc: ICON, ...options });
  };
  const askText = (label, current, onSet, maxLength = 80) => {
    const value = prompt(label, String(current ?? ""));
    if (value === null) return;
    const text = value.trim().slice(0, maxLength);
    if (!text) return tell("Missing value", "Enter a value and try again.");
    onSet(text);
    save();
    tell("Updated", `${label.replace(/\s*\(.*/, "")} changed to ${text}.`);
  };
  const askNumber = (label, current, min, max, onSet) => {
    const value = prompt(`${label} (${min}–${max})`, String(Number.isFinite(Number(current)) ? current : min));
    if (value === null) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return tell("Invalid number", "Enter a valid number and try again.");
    const result = bounded(number, min, max);
    onSet(result);
    save();
    tell("Updated", `${label} set to ${result.toLocaleString()}.`);
  };
  const people = () => {
    const groups = [
      ["Parents", state.parents], ["Family", state.family], ["Friends", state.friends],
      ["Partners", state.lovers], ["Exes", state.exes], ["Spouse", state.spouse ? [state.spouse] : []],
    ];
    const result = [];
    groups.forEach(([kind, list]) => (Array.isArray(list) ? list : []).forEach((person) => {
      if (person && person.first && !result.some((item) => item.person === person)) result.push({ kind, person });
    }));
    return result;
  };
  const personName = (p) => `${p.first || "Unknown"} ${p.last || ""}`.trim();
  const choose = (title, entries, onChoose, back = openAdvanced) => {
    if (!entries.length) return tell("Nothing to edit", "There are no matching entries in this life.", back);
    card({
      title,
      lead: "Choose an entry to edit.",
      choices: [...entries.map((entry, index) => [entry.label, () => onChoose(entry.value, index)]), ["Back", back]],
    });
  };

  function openAdvanced() {
    const job = state.job;
    const socialCount = Object.keys(state.social || {}).length;
    card({
      title: "Advanced Admin Controls",
      lead: "Local save editor for this single-player life. Changes affect this browser's current save.",
      rows: [
        ["Character", `${personName(state)} · age ${state.age || 0}`],
        ["Balance", formatMoney(state.money)],
        ["Career", job ? String(job.t || job.title || "Current job") : "No current job"],
        ["Relationships", String(people().length)],
        ["Social accounts", String(socialCount)],
      ],
      choices: [
        ["Edit all character stats", editStats],
        ["Edit identity & age", editIdentity],
        ["Edit money & assets", editFinances],
        ["Edit current job", editCareer],
        ["Edit a friend or family member", editPersonMenu],
        ["Add a friend", addFriend],
        ["Edit social accounts", editSocialMenu],
        ["Health, prison & life status", editStatus],
        ["Export / restore save backup", backupMenu],
        ["Return to Relationships", () => typeof window.openRelationships === "function" && window.openRelationships()],
      ],
    });
  }

  function editStats() {
    const stats = state.stats || (state.stats = {});
    const keys = Object.keys(stats).filter((key) => typeof stats[key] === "number" && Number.isFinite(stats[key]));
    const options = keys.map((key) => [key, () => askNumber(key, stats[key], 0, 100, (value) => { stats[key] = value; })]);
    options.push(["Set every numeric stat", () => askNumber("Set all stats", 100, 0, 100, (value) => keys.forEach((key) => { stats[key] = value; }))]);
    options.push(["Back", openAdvanced]);
    card({ title: "Character Stats", lead: "Edit every numeric stat currently present in this save.", choices: options });
  }

  function editIdentity() {
    card({
      title: "Identity & Age",
      rows: [["First name", state.first || ""], ["Last name", state.last || ""], ["Age", String(state.age ?? 0)], ["Country", state.country || ""], ["City", state.city || ""]],
      choices: [
        ["Edit first name", () => askText("First name", state.first, (value) => { state.first = value; }, 40)],
        ["Edit last name", () => askText("Last name", state.last, (value) => { state.last = value; }, 50)],
        ["Set age", () => askNumber("Age", state.age || 0, 0, 120, (value) => { state.age = value; })],
        ["Edit country code", () => askText("Country code (for example: us)", state.country, (value) => { state.country = value.toLowerCase(); }, 8)],
        ["Edit city", () => askText("City", state.city, (value) => { state.city = value; }, 60)],
        ["Back", openAdvanced],
      ],
    });
  }

  function editFinances() {
    card({
      title: "Money & Assets",
      rows: [["Cash", formatMoney(state.money)], ["Cars", String((state.cars || []).length)], ["Properties", String((state.props || []).length)], ["Pets", String((state.pets || []).length)]],
      choices: [
        ["Set cash balance", () => askNumber("Cash balance", state.money || 0, 0, MAX_MONEY, (value) => { state.money = value; })],
        ["Add cash", () => askNumber("Amount to add", 1000000, 0, MAX_MONEY, (value) => { state.money = Math.min(MAX_MONEY, (Number(state.money) || 0) + value); })],
        ["Edit an owned asset", editAssetMenu],
        ["Back", openAdvanced],
      ],
    });
  }

  function editAssetMenu() {
    const assets = [
      ...(state.cars || []).map((value, index) => ({ value, label: `Car ${index + 1}: ${value.make || ""} ${value.model || value.name || "vehicle"}`.trim(), type: "Car" })),
      ...(state.props || []).map((value, index) => ({ value, label: `Property ${index + 1}: ${value.name || value.type || "property"}`, type: "Property" })),
      ...(state.pets || []).map((value, index) => ({ value, label: `Pet ${index + 1}: ${value.name || value.species || "pet"}`, type: "Pet" })),
    ];
    choose("Owned Assets", assets, editAsset, editFinances);
  }
  function editAsset(asset, index) {
    const fields = Object.keys(asset).filter((key) => typeof asset[key] === "number" && Number.isFinite(asset[key]));
    const choices = fields.map((key) => [
      `Set ${key} (${asset[key]})`,
      () => askNumber(`${key} for this asset`, asset[key], 0, MAX_MONEY, (value) => { asset[key] = value; }),
    ]);
    choices.push(["Back", editAssetMenu]);
    card({ title: "Edit Asset", lead: `Editing item ${index + 1}. Numeric saved fields only.`, choices });
  }

  function editCareer() {
    if (!state.job || typeof state.job !== "object") state.job = { t: "Custom Role", pay: 0, perf: 50, yrs: 0 };
    const job = state.job;
    card({
      title: "Current Career",
      rows: [["Title", job.t || job.title || ""], ["Pay", formatMoney(job.pay)], ["Performance", `${job.perf ?? 50}%`], ["Years", String(job.yrs || 0)]],
      choices: [
        ["Set job title", () => askText("Job title", job.t || job.title, (value) => { job.t = value; })],
        ["Set annual pay", () => askNumber("Annual pay", job.pay || 0, 0, MAX_MONEY, (value) => { job.pay = value; })],
        ["Set job performance", () => askNumber("Job performance", job.perf ?? 50, 0, 100, (value) => { job.perf = value; })],
        ["Set years in this job", () => askNumber("Years in job", job.yrs || 0, 0, 200, (value) => { job.yrs = value; })],
        ["Leave current job", () => {
          if (typeof confirm === "function" && !confirm("Remove your current job from this save?")) return;
          state.job = null; save(); tell("Career updated", "Current job removed.");
        }],
        ["Back", openAdvanced],
      ],
    });
  }

  function editPersonMenu() {
    choose("People in Your Life", people().map(({ kind, person }) => ({ value: person, label: `${kind}: ${personName(person)}${person.dead ? " (deceased)" : ""}` })), editPerson, openAdvanced);
  }
  function editPerson(person) {
    const label = personName(person);
    card({
      tag: "Edit Person",
      person: { name: label, look: person.look, g: person.g || person.gender, age: typeof loverAge === "function" ? loverAge(person) : person.age, mood: person.dead ? "sad" : "happy" },
      title: label,
      rows: [["Relationship", `${person.rel ?? 50}%`], ["Status", person.dead ? "Deceased" : "Alive"], ["Best friend", person.best ? "Yes" : "No"]],
      choices: [
        ["Set relationship level", () => askNumber(`Relationship with ${person.first}`, person.rel ?? 50, 0, 100, (value) => { person.rel = value; })],
        ["Edit first name", () => askText("First name", person.first, (value) => { person.first = value; }, 40)],
        ["Edit last name", () => askText("Last name", person.last, (value) => { person.last = value; }, 50)],
        [person.best ? "Remove best-friend status" : "Make best friend", () => { person.best = !person.best; save(); tell("Updated", `${personName(person)} ${person.best ? "is now your best friend" : "is no longer marked as your best friend"}.`); }],
        [person.dead ? "Bring back to life" : "Mark deceased", () => {
          if (typeof confirm === "function" && !confirm(`${person.dead ? "Revive" : "Mark deceased"} ${personName(person)}?`)) return;
          person.dead = !person.dead; save(); tell("Person updated", `${personName(person)} is now marked ${person.dead ? "deceased" : "alive"}.`);
        }],
        ["Back to people", editPersonMenu],
      ],
    });
  }

  function addFriend() {
    const first = prompt("New friend's first name:");
    if (first === null || !first.trim()) return;
    const last = prompt("New friend's last name:", "") || "";
    const genderInput = prompt("Gender marker: m or f", "m");
    if (genderInput === null) return;
    const g = genderInput.toLowerCase().startsWith("f") ? "f" : "m";
    const friend = { first: first.trim().slice(0, 40), last: last.trim().slice(0, 50), g, age: Number(state.age) || 18, rel: 50, dead: false };
    try { if (typeof randomLook === "function") friend.look = randomLook(g, friend.age); } catch {}
    (state.friends ||= []).push(friend);
    save();
    tell("Friend added", `${personName(friend)} was added to this life.`, editPersonMenu);
  }

  function editSocialMenu() {
    const accounts = Object.entries(state.social || {}).filter(([, account]) => account && typeof account === "object");
    choose("Social Accounts", accounts.map(([key, value]) => ({ value, label: `${key}: ${Number(value.subs ?? value.followers ?? 0).toLocaleString()} followers` })), editSocialAccount, openAdvanced);
  }
  function editSocialAccount(account) {
    const fields = ["subs", "followers", "posts", "views", "momentum"].filter((key) => typeof account[key] === "number" || key === "subs" && typeof account.followers === "number" || key === "followers" && typeof account.subs === "number");
    const choices = fields.map((key) => {
      const actual = typeof account[key] === "number" ? key : key === "subs" ? "followers" : "subs";
      return [`Set ${key} (${account[actual] || 0})`, () => askNumber(key, account[actual] || 0, 0, MAX_MONEY, (value) => { account[actual] = value; })];
    });
    choices.push(["Back", editSocialMenu]);
    card({ title: "Edit Social Account", lead: "Set account totals for the selected profile.", choices });
  }

  function editStatus() {
    const mh = state.mh || state.mind || {};
    const fields = Object.keys(mh).filter((key) => typeof mh[key] === "number" && Number.isFinite(mh[key]));
    const choices = fields.map((key) => [`Set ${key} (${mh[key]})`, () => askNumber(key, mh[key], 0, 100, (value) => { mh[key] = value; })]);
    if (!fields.length) choices.push(["No extra mental-health values found", () => editStatus()]);
    choices.push([state.prison ? "Release from prison" : "Send to prison (toggle)" , () => {
      if (state.prison) state.prison = null;
      else state.prison = { years: 1, reason: "Admin edit" };
      save(); tell("Status updated", state.prison ? "Prison status enabled." : "You have been released from prison.");
    }]);
    choices.push([state.dead ? "Revive character" : "Mark character deceased", () => {
      if (typeof confirm === "function" && !confirm(`${state.dead ? "Revive" : "Mark deceased"} this character?`)) return;
      state.dead = !state.dead;
      document.querySelector(".phone")?.classList.toggle("died", !!state.dead);
      save(); tell("Life status updated", state.dead ? "Character marked deceased." : "Character revived.");
    }]);
    choices.push(["Back", openAdvanced]);
    card({ title: "Health & Life Status", lead: "Edit numeric mental-health values when present, or toggle life status.", choices });
  }

  function backupMenu() {
    card({
      title: "Save Backup",
      lead: "Export a JSON backup or restore a backup exported by this tool. Restoring replaces the current life; export first if you may want to undo it.",
      choices: [
        ["Export current life to a file", exportBackup],
        ["Restore backup from a file", importBackup],
        ["Back", openAdvanced],
      ],
    });
  }
  function exportBackup() {
    try {
      const payload = { format: "YourLife Admin Backup", version: 1, exportedAt: new Date().toISOString(), state: JSON.parse(JSON.stringify(state)) };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `yourlife-backup-${Date.now()}.json`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      tell("Backup exported", "A JSON backup of this life was downloaded.", backupMenu);
    } catch (e) { console.warn("[admin-plus] export", e); tell("Export failed", "The current save could not be exported.", backupMenu); }
  }
  function importBackup() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return tell("Backup too large", "Choose a JSON backup under 5 MB.", backupMenu);
      try {
        const payload = JSON.parse(await file.text());
        if (!payload || payload.format !== "YourLife Admin Backup" || payload.version !== 1 || !payload.state || typeof payload.state !== "object" || Array.isArray(payload.state))
          throw new Error("Unsupported backup format");
        if (typeof confirm === "function" && !confirm("Restore this backup and replace the current life? This cannot be undone unless you exported a backup first.")) return;
        const replacement = payload.state;
        Object.keys(state).forEach((key) => { delete state[key]; });
        Object.assign(state, replacement);
        document.querySelector(".phone")?.classList.toggle("died", !!state.dead);
        save();
        tell("Backup restored", "Your life was replaced with the selected backup.", openAdvanced);
      } catch (e) { console.warn("[admin-plus] import", e); tell("Restore failed", "That file is invalid or is not a compatible YourLife Admin backup.", backupMenu); }
    };
    input.click();
  }

  function installMenuRow() {
    if (typeof window.openRelationships !== "function" || window.openRelationships.__adminPlusWrapped) return;
    const original = window.openRelationships;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      try {
        if (!sTitle || !sList || sTitle.textContent !== "RELATIONSHIPS" || document.getElementById("apAdvancedRow")) return result;
        sList.insertAdjacentHTML("beforeend", `<div class="row" id="apAdvancedRow"><img src="${ICON}" alt=""><div class="t"><b>Advanced Admin Controls</b><span>Edit this life, career, friends, social accounts and backups</span></div>${typeof CHEV !== "undefined" ? CHEV : ""}</div>`);
        document.getElementById("apAdvancedRow").onclick = openAdvanced;
      } catch (e) { console.warn("[admin-plus] menu", e); }
      return result;
    };
    wrapped.__adminPlusWrapped = true;
    window.openRelationships = wrapped;
  }

  function boot() {
    if (typeof state === "undefined" || typeof jCard !== "function" || !document.getElementById("ageBtn") || typeof window.openRelationships !== "function") return setTimeout(boot, 150);
    if (window.FL_ADMIN_PLUS) return;
    installMenuRow();
    window.FL_ADMIN_PLUS = { open: openAdvanced, save, people };
    console.log("[admin-plus] loaded");
  }
  boot();
})();
