/* Murim Cultivator — screen router. One small module: later phases add
   panels without touching the shell. Screens: user, path, lobby,
   cultivate. */
var MC = window.MC || {};
window.MC = MC;

MC.SCREENS = ["user", "path", "lobby", "cultivate"];
MC.screen = "user";

MC.showScreen = function (name) {
  if (MC.SCREENS.indexOf(name) < 0) name = "lobby";
  for (var i = 0; i < MC.SCREENS.length; i++) {
    var el = document.getElementById("screen-" + MC.SCREENS[i]);
    if (el) el.classList.toggle("active", MC.SCREENS[i] === name);
  }
  MC.screen = name;
  var active = document.getElementById("screen-" + name);
  var h = active ? active.querySelector("h1, h2") : null;
  if (h && h.focus) h.focus({ preventScroll: true });
};
