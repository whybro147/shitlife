/* [mod] Relationship Stories + Admin Toolkit for YourLife. */
(() => {
  "use strict";
  const MODS = [
    {
      id: "relationship-stories-admin",
      name: "Relationship Stories + Admin Toolkit",
      icon: "emoji/1f4ac.png",
      src: "life-admin.js?v=1",
      desc: "Recurring named rivals, ex-partner conversations and reconciliation, responsive layout polish, and optional single-player God Mode/admin controls.",
    },
    {
      id: "admin-expansion",
      name: "Advanced Admin Controls",
      icon: "emoji/2699-fe0f.png",
      src: "admin-plus.js?v=1",
      desc: "Edit all numeric character stats, money, career details, friends and other relationships, social account counts, and export a save backup. Local single-player tools.",
    },
  ];

  function register() {
    const loader = window.MOD_LOADER;
    if (!loader || !Array.isArray(loader.MODS) || typeof loader.load !== "function") return setTimeout(register, 120);
    MODS.forEach((mod) => {
      if (!loader.MODS.some((m) => m.id === mod.id)) loader.MODS.push(mod);
      if (loader.isOn(mod)) loader.load(mod);
    });
  }
  register();

  const css = document.createElement("style");
  css.id = "flMobilePolish";
  css.textContent = `
    @media (max-width:600px) and (hover:none) {
      html,body { max-width:100%; overflow-x:hidden; }
      .phone { max-width:100vw; box-sizing:border-box; }
      #sList,.log,.ev,.jm,.notice,.jcw,.ev-wrap,.jm-wrap,.notice-wrap { min-width:0; max-width:100%; box-sizing:border-box; }
      #sList .row,.jcw,.jm,.ev { overflow-wrap:anywhere; }
      #sList .row .t { min-width:0; flex:1 1 auto; }
      #sList .row .t b,#sList .row .t span { overflow-wrap:anywhere; }
      .ev-wrap,.jm-wrap,.notice-wrap { padding-left:max(12px,env(safe-area-inset-left)); padding-right:max(12px,env(safe-area-inset-right)); }
      .ev,.jm,.notice { max-height:calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px); overflow-y:auto; overscroll-behavior:contain; }
      button,.ev-btn { min-height:44px; touch-action:manipulation; }
    }
  `;
  document.head.append(css);
})();
