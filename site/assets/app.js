"use strict";

(function () {
  // SoundCloud facade: the heavy player iframe loads only after a click.
  function play(card) {
    if (!card || card.classList.contains("playing")) return;
    var src = "https://w.soundcloud.com/player/?url=" + encodeURIComponent(card.getAttribute("data-sc")) +
      "&color=%23d4ff3a&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false";
    var frame = document.createElement("iframe");
    frame.src = src;
    frame.allow = "autoplay; encrypted-media";
    frame.loading = "eager";
    frame.title = card.querySelector("h3").textContent;
    var media = card.querySelector(".set-media");
    media.replaceChildren(frame);
    card.classList.add("playing");
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".play");
    if (btn) { play(btn.closest(".set")); return; }
    var live = e.target.closest("[data-listen]");
    if (live) {
      var card = document.querySelector('.set[data-index="' + live.getAttribute("data-listen") + '"]');
      if (card) {
        e.preventDefault();
        play(card);
        card.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      }
      return;
    }
    if (e.target.closest(".print")) window.print();
  });

  // Upcoming dates that have passed since the last build move to "past".
  var upcoming = document.querySelector('[data-list="upcoming"]');
  var past = document.querySelector('[data-list="past"]');
  if (upcoming && past) {
    var d = new Date();
    var today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    Array.prototype.slice.call(upcoming.children).reverse().forEach(function (li) {
      if (li.getAttribute("data-date") < today) past.prepend(li);
    });
    var empty = upcoming.parentNode.querySelector(".empty");
    if (empty) empty.hidden = upcoming.children.length > 0;
  }

  // Hero video: only on wide screens, without reduced motion or data saver.
  var video = document.querySelector("video.hero-media[data-src]");
  var saveData = navigator.connection && navigator.connection.saveData;
  if (video && !saveData && matchMedia("(min-width: 761px) and (prefers-reduced-motion: no-preference)").matches) {
    video.src = video.getAttribute("data-src");
    video.play().catch(function () {});
  }

  // Booking form: Web3Forms via fetch when a key is configured; a prefilled mailto is the fallback.
  var form = document.querySelector("form.form");
  if (!form) return;
  var status = form.querySelector(".status");
  var email = form.getAttribute("data-email");
  var hidden = ["access_key", "subject", "from_name", "redirect", "botcheck", "message"];
  function subject(data) {
    var parts = [data.get("organization"), data.get("event_date"), data.get("city")].filter(Boolean);
    return "Booking: " + (parts.length ? parts.join(" · ") : data.get("name") || "");
  }
  function mailto(data) {
    var lines = [];
    data.forEach(function (v, k) { if (v && hidden.indexOf(k) < 0) lines.push(k + ": " + v); });
    lines.push("", data.get("message") || "");
    return "mailto:" + email + "?subject=" + encodeURIComponent(subject(data)) + "&body=" + encodeURIComponent(lines.join("\n"));
  }
  function fallback(data, text) {
    var a = document.createElement("a");
    a.href = mailto(data);
    a.textContent = email;
    status.replaceChildren(document.createTextNode(text + " "), a);
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    if (!form.getAttribute("data-key")) {
      fallback(data, form.getAttribute("data-mailto"));
      location.href = mailto(data);
      return;
    }
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    status.textContent = form.getAttribute("data-sending");
    data.set("subject", subject(data));
    data.delete("redirect");
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: data, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.success) throw new Error(r.message);
        form.reset();
        status.textContent = form.getAttribute("data-sent");
      })
      .catch(function () { fallback(data, form.getAttribute("data-error")); })
      .then(function () { clearTimeout(timer); button.disabled = false; });
  });
})();
