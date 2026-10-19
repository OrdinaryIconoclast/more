/*
  more.js: shared header, navigation, and light/dark theme for the site.

  Add this line inside <head> on every page, right after the stylesheet:
    root pages:       <script src="more.js"></script>
    subfolder pages:  <script src="../more.js"></script>
  Keep it in <head> without "defer" so a saved theme applies before the page appears.

  The navigation lists the folders in this repository automatically, using the
  public GitHub API. New folders show up within an hour (the list is cached),
  or right away in a new browser tab.

  Pages written in Markdown: a page whose <main> has data-markdown="README.md"
  shows that file (from the same folder), converted to HTML by marked.js.
  The first "# Heading" in the README becomes the browser tab title.
*/
(function () {
  "use strict";

  /* ---------- Settings: edit these ---------- */
  var REPO = "OrdinaryIconoclast/more";
  var BRANCH = "main";
  var SITE_NAME = "more";
  // Folders that never appear in the navigation:
  var EXCLUDE = ["steamboat", "images", "media", "assets"];
  // Optional display names. Folders not listed here show their folder name:
  var LABELS = { "qemu-kvm": "QEMU/KVM" };
  // Used if GitHub can't be reached and nothing is cached yet.
  // Update it now and then so first-time visitors see your newest folders.
  var FALLBACK = ["audio", "homelab", "lightlife", "mobility", "qemu-kvm", "squarehome", "T5810"];
  var CACHE_HOURS = 1;

  /* ---------- Theme: follow the system unless the visitor flips the switch ---------- */
  var THEME_KEY = "more-theme";
  var NAV_KEY = "more-nav";
  var root = document.documentElement;
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) {
    try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (e) {}
  }

  var saved = read(THEME_KEY);
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  function systemTheme() { return systemDark.matches ? "dark" : "light"; }
  function currentTheme() { return root.getAttribute("data-theme") || systemTheme(); }

  function setTheme(theme) {
    // Choosing the same theme as the system clears the override,
    // so the page goes back to following the system.
    if (theme === systemTheme()) { root.removeAttribute("data-theme"); write(THEME_KEY, null); }
    else { root.setAttribute("data-theme", theme); write(THEME_KEY, theme); }
    syncSwitch();
  }

  function syncSwitch() {
    var sw = document.querySelector(".theme-switch");
    if (!sw) return;
    var dark = currentTheme() === "dark";
    sw.setAttribute("aria-checked", dark ? "true" : "false");
    sw.title = dark ? "Switch to light mode" : "Switch to dark mode";
  }

  if (systemDark.addEventListener) systemDark.addEventListener("change", syncSwitch);

  /* ---------- Paths ---------- */
  // The site root is wherever this script lives, so links work from any folder.
  var BASE = new URL(".", document.currentScript.src);

  function label(name) { return LABELS[name] || name; }
  function href(name) { return new URL(encodeURIComponent(name) + "/", BASE).href; }
  function isCurrent(name) { return location.pathname.indexOf(new URL(href(name)).pathname) === 0; }

  function clean(names) {
    return names
      .filter(function (n) { return n && n[0] !== "." && n[0] !== "_" && EXCLUDE.indexOf(n) === -1; })
      .sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }); });
  }

  /* ---------- Folder list from GitHub, cached ---------- */
  function cached() {
    try { return JSON.parse(read(NAV_KEY)) || null; } catch (e) { return null; }
  }

  function fetchFolders() {
    var url = "https://api.github.com/repos/" + REPO + "/contents/?ref=" + BRANCH;
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (items) {
        var names = clean(items.filter(function (i) { return i.type === "dir"; }).map(function (i) { return i.name; }));
        write(NAV_KEY, JSON.stringify({ time: Date.now(), names: names }));
        return names;
      });
  }

  /* ---------- Build the header ---------- */
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (text) node.textContent = text;
    return node;
  }

  var lastNames = [];
  function renderNav(names) {
    lastNames = names;
    var list = document.querySelector(".site-nav ul");
    if (list) {
      list.textContent = "";
      names.forEach(function (n) {
        var a = el("a", { href: href(n) }, label(n));
        if (isCurrent(n)) a.setAttribute("aria-current", "page");
        var li = el("li"); li.appendChild(a); list.appendChild(li);
      });
    }
    // Pages with <div id="section-index"></div> also get a grid of section links.
    var grid = document.getElementById("section-index");
    if (grid) {
      grid.textContent = "";
      names.forEach(function (n) { grid.appendChild(el("a", { href: href(n) }, label(n))); });
    }
  }

  function buildHeader() {
    var header = el("header", { class: "site-header" });
    var bar = el("div", { class: "site-bar" });

    var brand = el("a", { class: "brand", href: BASE.href }, SITE_NAME);
    if (location.pathname === BASE.pathname || location.pathname === BASE.pathname + "index.html") {
      brand.setAttribute("aria-current", "page");
    }

    var menu = el("button", { class: "nav-toggle", type: "button", "aria-expanded": "false", "aria-controls": "site-nav" });
    menu.innerHTML = '<span class="bars" aria-hidden="true"></span><span class="nav-toggle-text">Menu</span>';

    var sw = el("button", { class: "theme-switch", type: "button", role: "switch", "aria-label": "Dark mode" });
    sw.innerHTML = '<span class="track" aria-hidden="true"><span class="icon sun">☀</span><span class="icon moon">☾</span><span class="knob"></span></span>';
    sw.addEventListener("click", function () { setTheme(currentTheme() === "dark" ? "light" : "dark"); });

    var nav = el("nav", { class: "site-nav", id: "site-nav", "aria-label": "Sections" });
    nav.appendChild(el("ul"));

    menu.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      menu.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("nav-open")) {
        header.classList.remove("nav-open"); menu.setAttribute("aria-expanded", "false"); menu.focus();
      }
    });

    bar.appendChild(brand); bar.appendChild(nav); bar.appendChild(sw); bar.appendChild(menu);
    header.appendChild(bar);
    document.body.insertBefore(header, document.body.firstChild);
    syncSwitch();

    // Show the cached or fallback list immediately, then refresh from GitHub if it's stale.
    var c = cached();
    renderNav(c && c.names ? c.names : clean(FALLBACK.slice()));
    if (!c || Date.now() - c.time > CACHE_HOURS * 3600e3) {
      fetchFolders().then(renderNav).catch(function () {});
    }
  }

  /* ---------- Markdown pages ---------- */
  function loadMarked() {
    return new Promise(function (resolve, reject) {
      if (window.marked) return resolve();
      var s = el("script", { src: new URL("marked.js", BASE).href });
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function renderMarkdown() {
    var main = document.querySelector("main[data-markdown]");
    if (!main) return;
    var file = main.getAttribute("data-markdown") || "README.md";
    var text = fetch(file, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
    Promise.all([text, loadMarked()]).then(function (v) {
      main.innerHTML = window.marked.parse(v[0]);
      // Wide tables scroll sideways on phones instead of stretching the page.
      Array.prototype.forEach.call(main.querySelectorAll("table"), function (t) {
        var wrap = el("div", { class: "table-wrap" });
        t.parentNode.insertBefore(wrap, t); wrap.appendChild(t);
      });
      var h1 = main.querySelector("h1");
      if (h1) document.title = h1.textContent + (location.pathname === BASE.pathname ? "" : " · " + SITE_NAME);
      renderNav(lastNames); // fills a section grid if the README has one
    }).catch(function () {
      main.innerHTML = '<h1>Nothing here yet</h1><p class="lead">This folder doesn\'t have a README.md yet.</p>';
    });
  }

  function start() { buildHeader(); renderMarkdown(); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
