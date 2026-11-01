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

  // Booking form: Web3Forms via fetch when a key is configured, otherwise a prefilled mailto.
  var form = document.querySelector("form.form");
  if (!form) return;
  var status = form.querySelector(".status");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    if (!form.getAttribute("data-key")) {
      var lines = [];
      data.forEach(function (v, k) { if (v && k !== "message") lines.push(k + ": " + v); });
      lines.push("", data.get("message") || "");
      status.textContent = form.getAttribute("data-mailto");
      location.href = "mailto:" + form.getAttribute("data-email") + "?subject=" + encodeURIComponent("Booking: " + (data.get("organization") || data.get("name") || "")) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      return;
    }
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    status.textContent = form.getAttribute("data-sending");
    data.delete("redirect");
    fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: data })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.success) throw new Error(r.message);
        form.reset();
        status.textContent = form.getAttribute("data-sent");
      })
      .catch(function () {
        status.textContent = form.getAttribute("data-error") + " " + form.getAttribute("data-email");
      })
      .then(function () { button.disabled = false; });
  });
})();
