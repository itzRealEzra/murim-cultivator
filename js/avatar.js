/* Murim Cultivator — the avatar sprite, drawn in code.
   Layered inline SVG, origin anchored at the feet center so scaling and
   pose swaps never shift its position. Poses are transforms on named
   groups, not new drawings. One render function for every screen:
   MC.renderAvatar({ pose, door, realm, path }). Motes run on one rAF
   loop, paused when the tab is hidden. Under 80 DOM nodes. */
var MC = window.MC || {};
window.MC = MC;

MC.AURA_COLORS = ["#9db38a", "#7fa8a0", "#c9a24b", "#9a7fb8", "#8a94a6", "#e8c96a"];

MC.avatar = null;
MC._avSnap = "";
MC._motes = [];
MC._moteMode = "rise";
MC._moteTimer = 0;
MC._moteRaf = 0;

MC.buildAvatar = function (mount) {
  mount.textContent = "";
  var svg = MC.svgEl("svg", { viewBox: "0 0 200 300", class: "av", role: "img", "aria-label": "Cultivator at rest" });
  svg.setAttribute("data-pose", "idle");
  svg.appendChild(MC.svgEl("ellipse", { class: "ground", cx: 100, cy: 272, rx: 56, ry: 10 }));

  var aura = MC.svgEl("g", { class: "aura" });
  aura.appendChild(MC.svgEl("circle", { class: "halo", cx: 100, cy: 150, r: 78 }));
  aura.appendChild(MC.svgEl("circle", { class: "extra", cx: 100, cy: 165, r: 60 }));
  aura.appendChild(MC.svgEl("circle", { class: "ring r1", cx: 100, cy: 175, r: 52 }));
  aura.appendChild(MC.svgEl("circle", { class: "ring r2", cx: 100, cy: 175, r: 52 }));
  svg.appendChild(aura);

  var outer = MC.svgEl("g", { class: "avOuter" });
  var fig = MC.svgEl("g", { class: "fig", transform: "translate(100,268)" });
  var legs = MC.svgEl("g", { class: "legs", fill: "#1d1a16" });
  legs.appendChild(MC.svgEl("rect", { x: -14, y: -50, width: 12, height: 50, rx: 6 }));
  legs.appendChild(MC.svgEl("rect", { x: 2, y: -50, width: 12, height: 50, rx: 6 }));
  fig.appendChild(legs);

  var breathe = MC.svgEl("g", { class: "breathe" });
  breathe.appendChild(MC.svgEl("path", { class: "robe", fill: "#1d1a16",
    d: "M0 0 L-24 -78 Q0 -92 24 -78 L0 0 Z" }));
  var sh = MC.svgEl("rect", { class: "prop-body", x: -30, y: -86, width: 60, height: 14, rx: 7, fill: "#1d1a16" });
  breathe.appendChild(sh);
  breathe.appendChild(MC.svgEl("path", { class: "sash", d: "M-16 -70 L16 -46", stroke: "#b08d4f", "stroke-width": 3, fill: "none" }));
  var armL = MC.svgEl("path", { class: "arm armL", d: "M-12 -68 L-30 -36", stroke: "#1d1a16", "stroke-width": 9, "stroke-linecap": "round", fill: "none" });
  var armR = MC.svgEl("path", { class: "arm armR", d: "M12 -68 L30 -36", stroke: "#1d1a16", "stroke-width": 9, "stroke-linecap": "round", fill: "none" });
  breathe.appendChild(armL); breathe.appendChild(armR);
  var wraps = MC.svgEl("g", { class: "prop-wraps", stroke: "#b08d4f", "stroke-width": 3 });
  wraps.appendChild(MC.svgEl("line", { x1: -24, y1: -50, x2: -14, y2: -56 }));
  wraps.appendChild(MC.svgEl("line", { x1: 24, y1: -50, x2: 14, y2: -56 }));
  breathe.appendChild(wraps);
  var folded = MC.svgEl("path", { class: "folded", d: "M-22 -40 Q0 -24 22 -40", stroke: "#1d1a16", "stroke-width": 9, "stroke-linecap": "round", fill: "none" });
  breathe.appendChild(folded);
  var head = MC.svgEl("g", { class: "head" });
  head.appendChild(MC.svgEl("circle", { cx: 0, cy: -110, r: 16, fill: "#1d1a16" }));
  head.appendChild(MC.svgEl("circle", { cx: 0, cy: -128, r: 6, fill: "#1d1a16" }));
  head.appendChild(MC.svgEl("path", { d: "M-16 -110 a16 16 0 0 1 32 0", stroke: "#b08d4f", "stroke-width": 2, fill: "none" }));
  breathe.appendChild(head);

  var weapon = MC.svgEl("g", { class: "weapon" });
  var sword = MC.svgEl("g", { class: "prop prop-sword" });
  sword.appendChild(MC.svgEl("line", { x1: 18, y1: -18, x2: 50, y2: -108, stroke: "#b08d4f", "stroke-width": 5, "stroke-linecap": "round" }));
  sword.appendChild(MC.svgEl("line", { x1: 8, y1: -34, x2: 24, y2: -26, stroke: "#b08d4f", "stroke-width": 4, "stroke-linecap": "round" }));
  weapon.appendChild(sword);
  var gourd = MC.svgEl("g", { class: "prop prop-gourd" });
  gourd.appendChild(MC.svgEl("circle", { cx: 28, cy: -30, r: 10, fill: "none", stroke: "#5fae86", "stroke-width": 3 }));
  gourd.appendChild(MC.svgEl("rect", { x: 25, y: -46, width: 6, height: 8, fill: "#5fae86" }));
  weapon.appendChild(gourd);
  var orbit = MC.svgEl("g", { class: "prop prop-orbit", fill: "#efe7d3" });
  orbit.appendChild(MC.svgEl("rect", { x: -46, y: -78, width: 8, height: 18 }));
  orbit.appendChild(MC.svgEl("rect", { x: 38, y: -78, width: 8, height: 18 }));
  orbit.appendChild(MC.svgEl("rect", { x: -4, y: -34, width: 8, height: 18 }));
  weapon.appendChild(orbit);
  breathe.appendChild(weapon);
  fig.appendChild(breathe);
  outer.appendChild(fig);
  svg.appendChild(outer);

  var motes = MC.svgEl("g", { class: "motes", fill: "#efe7d3" });
  svg.appendChild(motes);
  mount.appendChild(svg);

  MC.avatar = { svg: svg, motesG: motes, motes: [] };
  MC.avatarLoop();
  return MC.avatar;
};

MC.pathLabel = function (p) {
  return { sword: "Sword Path", body: "Body Path", alchemy: "Alchemy Path", talisman: "Talisman Path" }[p] || "Pathless";
};

/* The one render function. Cheap: writes only on change. */
MC.renderAvatar = function (st) {
  if (!MC.avatar) return;
  var a = MC.avatar;
  var key = [st.pose, st.door ? 1 : 0, st.realm, st.path].join("|");
  var svg = a.svg;
  if (MC._avSnap !== key) {
    MC._avSnap = key;
    svg.setAttribute("data-pose", st.pose);
    svg.setAttribute("data-door", st.door ? "1" : "0");
    var show = function (sel, on) {
      var els = svg.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) els[i].style.display = on ? "" : "none";
    };
    show(".prop-sword", st.path === "sword");
    show(".prop-body", st.path === "body");
    show(".prop-wraps", st.path === "body");
    show(".prop-gourd", st.path === "alchemy");
    show(".prop-orbit", st.path === "talisman");
    show(".halo", st.realm >= 5);
    show(".extra", st.realm >= 2);
    var aura = st.door ? "#b3392f" : MC.AURA_COLORS[Math.min(5, st.realm)];
    var rings = svg.querySelectorAll(".ring, .halo, .extra");
    for (var j = 0; j < rings.length; j++) rings[j].setAttribute("stroke", aura);
    var poseWord = st.pose === "meditate" ? (st.door ? "Behind closed doors" : "Meditating") : "Standing";
    svg.setAttribute("aria-label", poseWord + ", " + MC.REALMS[st.realm].n + ", " + MC.pathLabel(st.path));
  }
  MC.avatarMotes(st.door ? 8 : 4);
};

MC.avatarMotes = function (want) {
  if (!MC.avatar) return;
  var a = MC.avatar;
  while (a.motes.length < want) {
    var c = MC.svgEl("circle", { r: 2.5, opacity: 0.85 });
    a.motesG.appendChild(c);
    a.motes.push({ el: c, x: 60 + Math.random() * 80, y: 120 + Math.random() * 130,
      v: 14 + Math.random() * 22, vx: 0, vy: 0 });
  }
  while (a.motes.length > want) {
    var m = a.motes.pop();
    if (m.el.isConnected) m.el.remove();
  }
};

MC.avatarLoop = function () {
  if (MC._moteRaf) return;
  var last = performance.now();
  var tick = function (t) {
    MC._moteRaf = 0;
    if (document.hidden || !MC.avatar) {
      if (!document.hidden) MC._moteRaf = requestAnimationFrame(tick);
      return;
    }
    var dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (!MC.still()) {
      var a = MC.avatar;
      if (MC._moteMode === "scatter") {
        MC._moteTimer -= dt;
        for (var i = 0; i < a.motes.length; i++) {
          var m = a.motes[i];
          m.x += m.vx * dt; m.y += m.vy * dt;
          m.el.setAttribute("cx", m.x.toFixed(1));
          m.el.setAttribute("cy", m.y.toFixed(1));
          m.el.setAttribute("opacity", Math.max(0.15, MC._moteTimer).toFixed(2));
        }
        if (MC._moteTimer <= 0) {
          MC._moteMode = "rise";
          for (var j = 0; j < a.motes.length; j++) {
            a.motes[j].x = 60 + Math.random() * 80;
            a.motes[j].y = 120 + Math.random() * 130;
            a.motes[j].v = 14 + Math.random() * 22;
            a.motes[j].el.setAttribute("opacity", 0.85);
          }
        }
      } else {
        for (var k = 0; k < a.motes.length; k++) {
          var n = a.motes[k];
          n.y -= n.v * dt;
          if (n.y < 40) { n.y = 250; n.x = 60 + Math.random() * 80; }
          n.el.setAttribute("cx", n.x.toFixed(1));
          n.el.setAttribute("cy", n.y.toFixed(1));
        }
      }
    }
    if (!document.hidden) MC._moteRaf = requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !MC._moteRaf) {
      last = performance.now();
      MC._moteRaf = requestAnimationFrame(tick);
    }
  });
  MC._moteRaf = requestAnimationFrame(tick);
};

/* Breakthrough answers: 600ms lift + burst ring, or shake + scatter. */
MC.avatarBurst = function (ok) {
  if (!MC.avatar) return;
  var outer = MC.avatar.svg.querySelector(".avOuter");
  outer.classList.remove("burst", "shake");
  void outer.getBoundingClientRect();
  if (MC.still()) return; // pose and aura already show the state
  if (ok) {
    outer.classList.add("burst");
    setTimeout(function () { outer.classList.remove("burst"); }, 650);
  } else {
    outer.classList.add("shake");
    MC._moteMode = "scatter";
    MC._moteTimer = 0.6;
    var a = MC.avatar;
    for (var i = 0; i < a.motes.length; i++) {
      var ang = Math.random() * Math.PI * 2;
      a.motes[i].vx = Math.cos(ang) * 120;
      a.motes[i].vy = Math.sin(ang) * 120;
    }
    setTimeout(function () { outer.classList.remove("shake"); }, 300);
  }
};
