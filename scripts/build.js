#!/usr/bin/env node
"use strict";

// Renders data/*.json + site/ into public/ as plain HTML (EN at /, TR at /tr) so crawlers that
// don't run JavaScript still read every word.
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var out = path.join(root, "public");
var strings = require("./i18n.js");
function readJson(name) { return JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8")); }

var profile = readJson("profile.json");
var releases = readJson("releases.json").slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
var gigs = readJson("gigs.json").slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
var media = readJson("media.json");

var SITE = profile.url;
var LANGS = ["en", "tr"];
var today = new Date().toISOString().slice(0, 10);
var version = (process.env.GITHUB_SHA || gitSha() || Date.now().toString(36)).slice(0, 12);
var links = profile.links.filter(function (l) { return l.url; });
var latest = releases[0];
var photoById = {};
media.photos.forEach(function (p) { photoById[p.id] = p; });
var heroPhoto = photoById[profile.hero.photo], heroMobile = photoById[profile.hero.mobilePhoto] || heroPhoto;
var logoMarkup = fs.readFileSync(path.join(root, "site/assets/img/logo-light.svg"), "utf8").trim();

function gitSha() {
  try { return childProcess.execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch (e) { return ""; }
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function t(lang, key) {
  var v = strings[lang][key];
  if (v == null) throw new Error("missing string " + lang + ":" + key);
  return v;
}
function L(lang, v) { return v && typeof v === "object" ? v[lang] : v; }
function prefix(lang) { return lang === "en" ? "" : "/" + lang; }
function pageUrl(lang, page) {
  var p = prefix(lang) + (page ? "/" + page : "");
  return SITE + (p || "/");
}
function localPath(lang, page) { return (prefix(lang) + (page ? "/" + page : "")) || "/"; }
function asset(p) { return "/assets/" + p + "?v=" + version; }
function fmtDate(lang, iso, opts) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", Object.assign({ timeZone: "UTC" }, opts || { day: "numeric", month: "short", year: "numeric" }));
}
function minutes(lang, sec) {
  var m = Math.round(sec / 60);
  return m >= 90 ? Math.floor(m / 60) + " " + t(lang, "hours") + " " + (m % 60) + " " + t(lang, "minutes") : m + " " + t(lang, "minutes");
}
function srcset(p, ext) { return p.widths.map(function (w) { return p.src + "-" + w + "." + ext + " " + w + "w"; }).join(", "); }
function fallback(p) { return p.src + "-" + p.widths[Math.min(1, p.widths.length - 1)] + ".webp"; }
// <picture> with AVIF + WebP sources; `mobile` swaps in a portrait crop on narrow screens.
function picture(p, sizes, attrs, mobile) {
  var sources = "";
  if (mobile && mobile !== p) {
    sources += '<source media="(max-width: 760px)" type="image/avif" srcset="' + srcset(mobile, "avif") + '" sizes="100vw">' +
      '<source media="(max-width: 760px)" type="image/webp" srcset="' + srcset(mobile, "webp") + '" sizes="100vw">';
  }
  sources += '<source type="image/avif" srcset="' + srcset(p, "avif") + '" sizes="' + sizes + '">' +
    '<source type="image/webp" srcset="' + srcset(p, "webp") + '" sizes="' + sizes + '">';
  return "<picture>" + sources + '<img src="' + fallback(p) + '" width="' + p.width + '" height="' + p.height + '"' + attrs + "></picture>";
}
// Inline logo; each copy needs its own gradient id.
var logoCount = 0;
function logo(cls) {
  var id = "lg" + (++logoCount);
  return logoMarkup.replace('role="img" aria-label="INÄN"', 'class="' + cls + '" aria-hidden="true" focusable="false"').replace('id="g"', 'id="' + id + '"').replace("url(#g)", "url(#" + id + ")");
}
function credit(p) { return "© " + (p.creditUrl ? '<a href="' + esc(p.creditUrl) + '" rel="noopener" target="_blank">' + esc(p.credit) + "</a>" : esc(p.credit)); }
function roles(lang) { return profile.roles.map(function (r) { return L(lang, r); }); }
function isoDuration(sec) { return "PT" + Math.floor(sec / 3600) + "H" + Math.floor((sec % 3600) / 60) + "M" + (sec % 60) + "S"; }
function icon(id) {
  var paths = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
    soundcloud: '<path d="M3 15v3M6 12v6M9 10v8M12 8v10h7a3 3 0 0 0 0-6 5 5 0 0 0-7-4"/>',
    residentadvisor: '<path d="M4 6h9a4 4 0 0 1 0 8H4zM13 14l5 4M4 18h4"/>',
    spotify: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.5-.7 5.3-.4 7.3.8M8.6 15.4c2-.5 4-.3 5.6.6"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="3.5"/><path d="M10 9v6l5-3z" fill="currentColor"/>',
    bandsintown: '<path d="M4 4h4v12h4V4h4v12h4v4H4z"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/>'
  };
  return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths[id] + "</svg>";
}

// ---------- structured data ----------
function jsonLd(lang, page, extra) {
  var sameAs = links.map(function (l) { return l.url; });
  var images = media.photos.filter(function (p) { return p.press; }).map(function (p) {
    return { "@type": "ImageObject", contentUrl: SITE + p.download, url: SITE + p.download, creditText: p.credit, copyrightNotice: "© " + p.credit + ". All rights reserved.",
      creator: { "@type": "Person", name: p.credit, url: p.creditUrl || undefined }, acquireLicensePage: SITE + "/epk" };
  });
  var graph = [
    { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: profile.name, inLanguage: ["en", "tr"], publisher: { "@id": SITE + "/#person" } },
    {
      "@type": "ProfilePage", "@id": pageUrl(lang, page) + "#page", url: pageUrl(lang, page), inLanguage: lang,
      isPartOf: { "@id": SITE + "/#website" }, mainEntity: { "@id": SITE + "/#person" }, dateModified: today
    },
    {
      "@type": "Person", "@id": SITE + "/#person", name: profile.name, alternateName: profile.alternateNames,
      jobTitle: ["DJ", "Music Director"], description: profile.tagline.en, url: SITE + "/", image: images.length ? images : SITE + "/assets/img/og.jpg",
      worksFor: profile.worksFor ? { "@type": "Organization", name: profile.worksFor } : undefined,
      email: "mailto:" + profile.email, homeLocation: { "@type": "City", name: profile.city.en, address: { "@type": "PostalAddress", addressLocality: profile.city.en, addressCountry: profile.country } },
      knowsAbout: profile.genres, sameAs: sameAs, memberOf: { "@id": SITE + "/#artist" }
    },
    profile.eventSeries ? { "@type": "EventSeries", "@id": SITE + "/#series", name: profile.eventSeries, organizer: { "@id": SITE + "/#person" }, performer: { "@id": SITE + "/#artist" }, location: { "@type": "City", name: profile.city.en } } : null,
    {
      "@type": "MusicGroup", "@id": SITE + "/#artist", name: profile.name, alternateName: profile.alternateNames,
      description: profile.tagline.en, genre: profile.genres, url: SITE + "/", image: SITE + "/assets/img/og.jpg", logo: SITE + "/assets/img/logo.svg",
      foundingLocation: { "@type": "City", name: profile.city.en }, member: { "@id": SITE + "/#person" }, sameAs: sameAs,
      track: releases.map(function (r) {
        return { "@type": "MusicRecording", name: r.title, url: r.url, datePublished: r.date, duration: isoDuration(r.duration), byArtist: { "@id": SITE + "/#artist" } };
      })
    }
  ];
  return '<script type="application/ld+json">' + JSON.stringify({ "@context": "https://schema.org", "@graph": graph.filter(Boolean).concat(extra || []) }).replace(/</g, "\\u003c") + "</script>";
}
function gigEvent(g) {
  var ev = {
    "@type": "MusicEvent", name: profile.name + " at " + g.venue + (g.title ? " — " + g.title.en : ""), startDate: g.date,
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: g.venue, address: { "@type": "PostalAddress", addressLocality: L("en", g.city), addressCountry: g.country } },
    performer: { "@id": SITE + "/#artist" }, organizer: { "@type": "Organization", name: g.venue }
  };
  if (g.tickets) ev.offers = { "@type": "Offer", url: g.tickets, availability: "https://schema.org/InStock" };
  return ev;
}

// ---------- layout ----------
function head(lang, page, title, description, extraHead) {
  var alt = LANGS.map(function (l) { return '<link rel="alternate" hreflang="' + l + '" href="' + pageUrl(l, page) + '">'; }).join("\n  ");
  return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "  <title>" + esc(title) + "</title>\n" +
    '  <meta name="description" content="' + esc(description) + '">\n' +
    '  <meta name="keywords" content="INÄN, INÄN DJ, inan.sounds, Istanbul Techno DJ, Berlin Techno, Indie Dance DJ, Nu Disco, Deep House, Marcel Avant, Sound of Berlin">\n' +
    '  <meta name="author" content="' + esc(profile.name) + '">\n' +
    '  <meta name="theme-color" content="#0a0a0b">\n' +
    '  <link rel="canonical" href="' + pageUrl(lang, page) + '">\n  ' + alt + "\n" +
    '  <link rel="alternate" hreflang="x-default" href="' + pageUrl("en", page) + '">\n' +
    links.map(function (l) { return '  <link rel="me" href="' + esc(l.url) + '">\n'; }).join("") +
    '  <meta property="og:type" content="profile">\n' +
    '  <meta property="og:site_name" content="' + esc(profile.name) + '">\n' +
    '  <meta property="og:title" content="' + esc(title) + '">\n' +
    '  <meta property="og:description" content="' + esc(description) + '">\n' +
    '  <meta property="og:url" content="' + pageUrl(lang, page) + '">\n' +
    '  <meta property="og:image" content="' + SITE + '/assets/img/og.jpg">\n' +
    '  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n' +
    '  <meta property="og:locale" content="' + (lang === "tr" ? "tr_TR" : "en_GB") + '">\n' +
    '  <meta property="og:locale:alternate" content="' + (lang === "tr" ? "en_GB" : "tr_TR") + '">\n' +
    '  <meta property="og:see_also" content="https://soundcloud.com/inansounds">\n' +
    '  <meta property="og:see_also" content="https://www.instagram.com/inan.sounds/">\n' +
    '  <meta name="twitter:card" content="summary_large_image">\n' +
    '  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">\n' +
    '  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">\n' +
    '  <link rel="stylesheet" href="' + asset("styles.css") + '">\n' +
    '  <script src="' + asset("app.js") + '" defer></script>\n' +
    (extraHead || "") +
    "</head>\n";
}
function header(lang, page) {
  var other = lang === "en" ? "tr" : "en";
  var home = localPath(lang, "");
  var anchors = page ? home : "";
  var nav = [["about", "nav.about"], ["music", "nav.music"], ["gigs", "nav.gigs"], ["media", "nav.media"]].map(function (n) {
    return '<a href="' + anchors + "#" + n[0] + '">' + esc(t(lang, n[1])) + "</a>";
  }).join("");
  return '<a class="skip" href="#main">' + esc(t(lang, "skip")) + "</a>\n" +
    '<header class="site-header">\n  <a class="brand" href="' + home + '" aria-label="' + esc(profile.name) + '">' + logo("brand-logo") + '</a>\n' +
    '  <nav class="nav" aria-label="' + esc(t(lang, "nav.primary")) + '">' + nav +
    '<a href="' + localPath(lang, "epk") + '">' + esc(t(lang, "nav.epk")) + "</a></nav>\n" +
    '  <a class="lang" href="' + localPath(other, page) + '" hreflang="' + other + '" lang="' + other + '" title="' + esc(t(lang, "lang.label")) + '">' + esc(t(lang, "lang.short")) + "</a>\n" +
    '  <a class="btn btn-small" href="' + anchors + '#booking">' + esc(t(lang, "nav.booking")) + "</a>\n</header>\n";
}
function socialList(cls) {
  return '<ul class="' + cls + '">' + links.map(function (l) {
    return '<li><a href="' + esc(l.url) + '" rel="me noopener" target="_blank">' + icon(l.id) + "<span>" + esc(l.label) + "</span></a></li>";
  }).join("") + "</ul>";
}
function footer(lang) {
  return '<footer class="site-footer">\n  ' + socialList("social") + "\n" +
    '  <p><a href="mailto:' + profile.email + '">' + profile.email + "</a> · " + esc(L(lang, profile.city)) + "</p>\n" +
    "  <p class=\"fine\">© " + new Date().getFullYear() + " " + esc(profile.name) + ". " + esc(t(lang, "footer.rights")) + " " +
    '<a href="https://github.com/collective-bucket/inan">' + esc(t(lang, "footer.code")) + "</a> · " +
    (profile.pressKit ? '<a href="' + esc(profile.pressKit) + '" download>' + esc(t(lang, "booking.presskit")) + " (PDF)</a> · " : "") +
    '<a href="' + localPath(lang, "privacy") + '">' + esc(t(lang, "footer.privacy")) + "</a></p>\n</footer>\n";
}
function page(lang, name, title, description, body, ld, extraHead) {
  return head(lang, name, title, description, extraHead) + "<body>\n" + header(lang, name) +
    '<main id="main">\n' + body + "</main>\n" + footer(lang) + ld + "\n</body>\n</html>\n";
}

// ---------- sections ----------
function hero(lang) {
  var bg = "";
  if (profile.hero.video) {
    bg = '<video class="hero-media" muted loop playsinline preload="none" data-src="' + esc(profile.hero.video) + '"' +
      (heroPhoto ? ' poster="' + fallback(heroPhoto) + '"' : "") + "></video>";
  } else if (heroPhoto) {
    bg = picture(heroPhoto, "100vw", ' class="hero-media focus-' + (heroPhoto.focus || "center") + '" alt="" fetchpriority="high" decoding="async"', heroMobile);
  }
  return '<section class="hero" aria-labelledby="hero-title">\n  ' + bg + '\n  <div class="hero-bg" aria-hidden="true"></div>\n' +
    '  <div class="hero-inner">\n    <p class="eyebrow">' + esc(t(lang, "hero.role")) + " · " + esc(L(lang, profile.city)) + "</p>\n" +
    '    <h1 id="hero-title">' + logo("hero-logo") + '<span class="sr-only">' + esc(profile.name) + '</span></h1>\n    <p class="lede">' + esc(L(lang, profile.tagline)) + "</p>\n" +
    '    <div class="cta">\n      <a class="btn btn-live" href="' + esc(latest.url) + '" data-listen="0">' + icon("play") + "<span>" + esc(t(lang, "hero.listen")) + "</span></a>\n" +
    '      <a class="btn btn-ghost" href="#booking">' + esc(t(lang, "hero.book")) + "</a>\n    </div>\n" +
    '    <p class="latest">' + esc(t(lang, "hero.latest")) + ': <a href="' + esc(latest.url) + '">' + esc(latest.title) + "</a></p>\n" +
    "  </div>\n</section>\n";
}
function about(lang) {
  return '<section id="about" class="section" aria-labelledby="about-title">\n  <h2 id="about-title">' + esc(t(lang, "about.title")) + "</h2>\n" +
    '  <div class="about">\n    <div class="prose">' + profile.bio[lang].map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>\n" +
    '    <dl class="facts">\n      <div><dt>' + esc(t(lang, "about.roles")) + "</dt><dd>" + esc(roles(lang).join(" · ")) + "</dd></div>\n" +
    "      <div><dt>" + esc(t(lang, "about.genres")) + "</dt><dd>" + esc(profile.genres.join(" · ")) + " · " + esc(profile.bpm) + " BPM</dd></div>\n" +
    "      <div><dt>" + esc(t(lang, "about.based")) + "</dt><dd>" + esc(L(lang, profile.city)) + "</dd></div>\n" +
    "      <div><dt>" + esc(t(lang, "about.venues")) + "</dt><dd>" + esc(profile.venues.join(" · ")) + "</dd></div>\n    </dl>\n  </div>\n</section>\n";
}
function setCard(lang, r, i) {
  return '<li class="set" data-sc="' + esc(r.url) + '" data-index="' + i + '">\n' +
    '  <div class="set-media"><img src="' + esc(r.artwork) + '" alt="" width="400" height="400" loading="lazy" decoding="async">' +
    '<button type="button" class="play" aria-label="' + esc(t(lang, "music.play") + ": " + r.title) + '">' + icon("play") + "</button></div>\n" +
    '  <div class="set-body"><h3><a href="' + esc(r.url) + '">' + esc(r.title) + "</a></h3>\n" +
    '  <p class="meta"><time datetime="' + r.date + '">' + esc(fmtDate(lang, r.date)) + "</time> · " + esc(minutes(lang, r.duration)) + " · " + esc(r.genre) + (r.bpm ? " · " + esc(r.bpm) + " BPM" : "") + "</p></div>\n</li>";
}
function music(lang) {
  return '<section id="music" class="section" aria-labelledby="music-title">\n  <h2 id="music-title">' + esc(t(lang, "music.title")) + "</h2>\n" +
    '  <p class="section-intro">' + esc(t(lang, "music.intro")) + "</p>\n" +
    '  <ul class="sets">\n' + releases.map(function (r, i) { return setCard(lang, r, i); }).join("\n") + "\n  </ul>\n" +
    '  <p><a class="more" href="https://soundcloud.com/inansounds" rel="noopener" target="_blank">' + icon("soundcloud") + esc(t(lang, "music.all")) + " →</a></p>\n</section>\n";
}
function gigItem(lang, g) {
  var actions = [];
  if (g.tickets) actions.push('<a href="' + esc(g.tickets) + '" rel="noopener" target="_blank">' + esc(t(lang, "gigs.tickets")) + "</a>");
  if (g.recording) actions.push('<a href="' + esc(g.recording) + '">' + esc(t(lang, "gigs.recording")) + "</a>");
  return '<li class="gig" data-date="' + g.date + '"><time datetime="' + g.date + '"><span class="d">' + esc(fmtDate(lang, g.date, { day: "2-digit" })) +
    '</span><span class="m">' + esc(fmtDate(lang, g.date, { month: "short", year: "numeric" })) + "</span></time>" +
    '<div class="gig-body"><strong>' + esc(g.venue) + "</strong>" + (g.title ? " <span>" + esc(L(lang, g.title)) + "</span>" : "") +
    '<span class="city">' + esc(L(lang, g.city)) + "</span></div>" + (actions.length ? '<div class="gig-actions">' + actions.join("") + "</div>" : "") + "</li>";
}
function gigsSection(lang) {
  var upcoming = gigs.filter(function (g) { return g.date >= today; }).reverse();
  var past = gigs.filter(function (g) { return g.date < today; });
  return '<section id="gigs" class="section" aria-labelledby="gigs-title">\n  <h2 id="gigs-title">' + esc(t(lang, "gigs.title")) + "</h2>\n" +
    '  <div class="gigs">\n    <div><h3>' + esc(t(lang, "gigs.upcoming")) + "</h3>\n" +
    '    <p class="empty"' + (upcoming.length ? " hidden" : "") + ">" + esc(t(lang, "gigs.none")) + "</p>\n" +
    '    <ol class="gig-list" data-list="upcoming">' + upcoming.map(function (g) { return gigItem(lang, g); }).join("") + "</ol></div>\n" +
    "    <div><h3>" + esc(t(lang, "gigs.past")) + "</h3>\n" +
    '    <ol class="gig-list" data-list="past">' + past.map(function (g) { return gigItem(lang, g); }).join("") + "</ol></div>\n  </div>\n</section>\n";
}
function mediaSection(lang) {
  var ig = profile.links.filter(function (l) { return l.id === "instagram"; })[0];
  var body;
  if (!media.photos.length && !media.videos.length) {
    body = '  <div class="placeholder"><p>' + esc(t(lang, "media.soon")) + '</p><a class="btn btn-ghost" href="' + esc(ig.url) + '" rel="noopener" target="_blank">' + icon("instagram") + "<span>" + esc(t(lang, "media.follow")) + "</span></a></div>\n";
  } else {
    body = '  <ul class="gallery">' + media.photos.filter(function (p) { return p.gallery !== false; }).map(function (p) {
      return "<li><figure>" + picture(p, "(max-width: 600px) 100vw, (max-width: 1120px) 50vw, 280px", ' class="focus-' + (p.focus || "center") + '" alt="' + esc(L(lang, p.alt)) + '" loading="lazy" decoding="async"') +
        "<figcaption>" + credit(p) + "</figcaption></figure></li>";
    }).join("") + media.videos.map(function (v) {
      return '<li class="video" data-yt="' + esc(v.youtubeId) + '"><a href="https://www.youtube.com/watch?v=' + esc(v.youtubeId) + '">' +
        '<img src="' + esc(v.poster) + '" alt="" loading="lazy">' + icon("play") + "<span>" + esc(L(lang, v.title)) + "</span></a></li>";
    }).join("") + "</ul>\n";
  }
  return '<section id="media" class="section" aria-labelledby="media-title">\n  <h2 id="media-title">' + esc(t(lang, "media.title")) + "</h2>\n" + body +
    '  <p class="fine">' + esc(t(lang, "media.rights")) + "</p>\n</section>\n";
}
function bookingSection(lang) {
  var key = profile.form.web3formsAccessKey;
  var action = key ? "https://api.web3forms.com/submit" : "mailto:" + profile.email;
  var f = function (name, label, type, extra) {
    return '<label><span>' + esc(t(lang, label)) + "</span><input name=\"" + name + '" type="' + type + '"' + (extra || "") + "></label>";
  };
  return '<section id="booking" class="section" aria-labelledby="booking-title">\n  <h2 id="booking-title">' + esc(t(lang, "booking.title")) + "</h2>\n" +
    '  <div class="booking">\n    <div>\n      <p class="section-intro">' + esc(t(lang, "booking.intro")) + "</p>\n" +
    '      <p class="contact-line">' + icon("mail") + '<span><span class="label">' + esc(t(lang, "booking.email")) + '</span><a href="mailto:' + profile.email + '">' + profile.email + "</a></span></p>\n" +
    (profile.pressKit ? '      <p class="contact-line">' + icon("file") + '<span><span class="label">' + esc(t(lang, "booking.presskit")) + '</span><a href="' + esc(profile.pressKit) + '" download>' + esc(t(lang, "epk.pdf")) + "</a></span></p>\n" : "") +
    (profile.management ? '      <p class="contact-line"><span><span class="label">' + esc(t(lang, "booking.management")) + "</span>" + esc(profile.management.name) +
      (profile.management.email ? ' · <a href="mailto:' + esc(profile.management.email) + '">' + esc(profile.management.email) + "</a>" : "") + "</span></p>\n" : "") +
    "      " + socialList("social") + "\n    </div>\n" +
    '    <form class="form" method="post" action="' + action + '"' + (key ? "" : ' enctype="text/plain"') + ' data-key="' + (key ? "1" : "") + '" data-email="' + profile.email + '"' +
    ' data-sending="' + esc(t(lang, "booking.sending")) + '" data-sent="' + esc(t(lang, "booking.sent")) + '" data-error="' + esc(t(lang, "booking.error")) + '" data-mailto="' + esc(t(lang, "booking.mailto")) + '">\n' +
    (key ? '      <input type="hidden" name="access_key" value="' + esc(key) + '">\n      <input type="hidden" name="subject" value="Booking enquiry: inansounds.com">\n' +
      '      <input type="hidden" name="from_name" value="inansounds.com">\n      <input type="hidden" name="redirect" value="' + pageUrl(lang, "thanks") + '">\n' +
      '      <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off">\n' : "") +
    "      " + f("name", "booking.name", "text", ' required autocomplete="name"') + "\n" +
    "      " + f("email", "booking.from", "email", ' required autocomplete="email"') + "\n" +
    "      " + f("organization", "booking.org", "text", ' autocomplete="organization"') + "\n" +
    '      <div class="row">' + f("event_date", "booking.date", "date") + f("city", "booking.city", "text") + "</div>\n" +
    '      <label><span>' + esc(t(lang, "booking.message")) + '</span><textarea name="message" rows="5" required></textarea></label>\n' +
    '      <button class="btn btn-live" type="submit">' + esc(t(lang, "booking.send")) + "</button>\n" +
    '      <p class="status" role="status" aria-live="polite"></p>\n' +
    '      <p class="fine"><a href="' + localPath(lang, "privacy") + '">' + esc(t(lang, "booking.privacy")) + "</a></p>\n" +
    "    </form>\n  </div>\n</section>\n";
}

// ---------- pages ----------
function homePage(lang) {
  var title = profile.name + (lang === "tr" ? " | İstanbul Techno ve Indie Dance DJ (inan.sounds)" : " | Istanbul Techno & Indie Dance DJ (inan.sounds)");
  var preload = heroPhoto && !profile.hero.video ?
    (heroMobile !== heroPhoto ? '  <link rel="preload" as="image" type="image/avif" media="(max-width: 760px)" imagesrcset="' + srcset(heroMobile, "avif") + '" imagesizes="100vw" fetchpriority="high">\n' : "") +
    '  <link rel="preload" as="image" type="image/avif"' + (heroMobile !== heroPhoto ? ' media="(min-width: 761px)"' : "") + ' imagesrcset="' + srcset(heroPhoto, "avif") + '" imagesizes="100vw" fetchpriority="high">\n' : "";
  return page(lang, "", title, L(lang, profile.tagline) + " " + profile.genres.join(", ") + ".",
    hero(lang) + about(lang) + music(lang) + gigsSection(lang) + mediaSection(lang) + bookingSection(lang),
    jsonLd(lang, "", gigs.map(gigEvent)), preload);
}
function epkPage(lang) {
  var photos = media.photos.filter(function (p) { return p.press; });
  var body = '<article class="section epk">\n  <div class="epk-head"><h1>' + esc(profile.name) + " · " + esc(t(lang, "epk.title")) + "</h1>" +
    '<div class="epk-actions">' + (profile.pressKit ? '<a class="btn btn-small" href="' + esc(profile.pressKit) + '" download>' + esc(t(lang, "epk.pdf")) + "</a>" : "") +
    '<button type="button" class="btn btn-ghost btn-small print">' + esc(t(lang, "epk.print")) + "</button></div></div>\n" +
    '  <p class="lede">' + esc(L(lang, profile.tagline)) + "</p>\n" +
    "  <h2>" + esc(t(lang, "epk.short")) + '</h2>\n  <div class="prose">' + profile.bio[lang].map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>\n" +
    "  <h2>" + esc(t(lang, "epk.facts")) + '</h2>\n  <dl class="facts">' +
    "<div><dt>" + esc(t(lang, "about.roles")) + "</dt><dd>" + esc(roles(lang).join(" · ")) + "</dd></div>" +
    "<div><dt>" + esc(t(lang, "about.genres")) + "</dt><dd>" + esc(profile.genres.join(" · ")) + "</dd></div>" +
    "<div><dt>" + esc(t(lang, "epk.bpm")) + "</dt><dd>" + esc(profile.bpm) + "</dd></div>" +
    "<div><dt>" + esc(t(lang, "about.based")) + "</dt><dd>" + esc(L(lang, profile.city)) + "</dd></div>" +
    "<div><dt>" + esc(t(lang, "about.venues")) + "</dt><dd>" + esc(profile.venues.join(" · ")) + "</dd></div></dl>\n" +
    "  <h2>" + esc(t(lang, "epk.sets")) + '</h2>\n  <ol class="plain">' + releases.slice(0, 5).map(function (r) {
      return '<li><a href="' + esc(r.url) + '">' + esc(r.title) + "</a> <span class=\"meta\">" + esc(fmtDate(lang, r.date)) + " · " + esc(minutes(lang, r.duration)) + "</span></li>";
    }).join("") + "</ol>\n" +
    "  <h2>" + esc(t(lang, "epk.links")) + '</h2>\n  <ul class="plain">' + links.map(function (l) {
      return "<li>" + esc(l.label) + ': <a href="' + esc(l.url) + '" rel="me">' + esc(l.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")) + "</a></li>";
    }).join("") + "</ul>\n" +
    "  <h2>" + esc(t(lang, "epk.photos")) + "</h2>\n" + (photos.length ? '  <ul class="gallery">' + photos.map(function (p) {
      return "<li><figure>" + picture(p, "(max-width: 600px) 100vw, 280px", ' class="focus-' + (p.focus || "center") + '" alt="' + esc(L(lang, p.alt)) + '" loading="lazy" decoding="async"') +
        "<figcaption>" + credit(p) + (p.download ? ' · <a href="' + esc(p.download) + '" download>' + esc(t(lang, "epk.download")) + "</a>" : "") + "</figcaption></figure></li>";
    }).join("") + "</ul>\n  <p class=\"fine\">" + esc(t(lang, "media.rights")) + "</p>\n" : "  <p>" + esc(t(lang, "epk.photosSoon")) + "</p>\n") +
    "  <h2>" + esc(t(lang, "epk.logo")) + '</h2>\n  <ul class="logos">' +
    '<li class="logo-dark"><img src="/assets/img/logo.svg" alt="" width="240" height="102"><a href="/assets/img/logo.svg" download="inan-logo.svg">' + esc(t(lang, "epk.logoDark")) + "</a></li>" +
    '<li><img src="/assets/img/logo-light.svg" alt="" width="240" height="102"><a href="/assets/img/logo-light.svg" download="inan-logo-light.svg">' + esc(t(lang, "epk.logoLight")) + "</a></li></ul>\n" +
    "  <h2>" + esc(t(lang, "epk.rider")) + "</h2>\n  <p>" + (profile.rider ? esc(L(lang, profile.rider)) : esc(t(lang, "epk.riderSoon"))) + "</p>\n" +
    "  <h2>" + esc(t(lang, "epk.contact")) + '</h2>\n  <p><a href="mailto:' + profile.email + '">' + profile.email + "</a>" +
    (profile.management ? " · " + esc(profile.management.name) : "") + "</p>\n</article>\n";
  return page(lang, "epk", profile.name + " · " + t(lang, "epk.title"), L(lang, profile.tagline), body, jsonLd(lang, "epk"));
}
var privacyText = {
  en: [
    "This site sets no cookies and runs no analytics or tracking.",
    "The booking form sends your name, email and message through Web3Forms (web3forms.com) to " + profile.email + ". The data is used only to answer your enquiry and is not shared or sold.",
    "Music players come from SoundCloud and load only after you press play; from then on SoundCloud's own privacy policy applies.",
    "To see or delete what you sent, write to " + profile.email + "."
  ],
  tr: [
    "Bu site çerez kullanmaz, analiz ya da takip aracı çalıştırmaz.",
    "Booking formu adını, e-posta adresini ve mesajını Web3Forms (web3forms.com) üzerinden " + profile.email + " adresine iletir. Bu bilgiler yalnızca talebine yanıt vermek için kullanılır; paylaşılmaz, satılmaz.",
    "Müzik oynatıcıları SoundCloud'dan gelir ve yalnızca oynata bastıktan sonra yüklenir; bu andan itibaren SoundCloud'un gizlilik politikası geçerlidir.",
    "Gönderdiğin bilgileri görmek ya da sildirmek için " + profile.email + " adresine yaz (KVKK m. 11)."
  ]
};
function simplePage(lang, name, title, paragraphs, extra) {
  var body = '<article class="section narrow">\n  <h1>' + esc(title) + "</h1>\n" + paragraphs.map(function (p) { return "  <p>" + esc(p) + "</p>\n"; }).join("") + (extra || "") + "</article>\n";
  return page(lang, name, profile.name + " · " + title, paragraphs[0], body, "");
}
function notFound() {
  var body = '<article class="section narrow">\n  <h1>404</h1>\n  <p>' + esc(t("en", "notfound.title")) + " · " + esc(t("tr", "notfound.title")) + "</p>\n" +
    '  <p><a class="btn btn-ghost" href="/">' + esc(t("en", "notfound.back")) + '</a> <a class="btn btn-ghost" href="/tr">' + esc(t("tr", "notfound.back")) + "</a></p>\n</article>\n";
  return head("en", "", profile.name + " · 404", t("en", "notfound.title"), '  <meta name="robots" content="noindex">\n').replace(/  <link rel="canonical"[^\n]*\n/, "") +
    "<body>\n" + header("en", "404").replace('href="/tr/404"', 'href="/tr"') + '<main id="main">\n' + body + "</main>\n" + footer("en") + "</body>\n</html>\n";
}

// ---------- crawler files ----------
var PAGES = ["", "epk", "privacy"];
function sitemap() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    PAGES.map(function (p) {
      return LANGS.map(function (lang) {
        return "  <url><loc>" + pageUrl(lang, p) + "</loc><lastmod>" + today + "</lastmod>" +
          LANGS.map(function (l) { return '<xhtml:link rel="alternate" hreflang="' + l + '" href="' + pageUrl(l, p) + '"/>'; }).join("") + "</url>\n";
      }).join("");
    }).join("") + "</urlset>\n";
}
function robots() {
  var bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];
  return "User-agent: *\nAllow: /\n\n" + bots.map(function (b) { return "User-agent: " + b + "\nAllow: /\n"; }).join("\n") + "\nSitemap: " + SITE + "/sitemap.xml\n";
}
function llms() {
  var upcoming = gigs.filter(function (g) { return g.date >= today; }).reverse();
  var past = gigs.filter(function (g) { return g.date < today; });
  var gigLine = function (g) { return "- " + g.date + ": " + g.venue + (g.title ? " (" + g.title.en + ")" : "") + ", " + L("en", g.city) + (g.recording ? " — recording: " + g.recording : ""); };
  return "# " + profile.name + "\n\n> " + profile.tagline.en + " Also known as " + profile.alternateNames.join(", ") + ".\n\n" +
    profile.bio.en.join("\n\n") + "\n\n" +
    "- Roles: " + roles("en").join(", ") + "\n- Genres: " + profile.genres.join(", ") + " (" + profile.bpm + " BPM)\n- Based in: " + profile.city.en + ", Türkiye\n- Venues: " + profile.venues.join(", ") +
    "\n- Booking: " + profile.email + (profile.management ? " / management: " + profile.management.name : "") + "\n\n" +
    "## Links\n\n" + links.map(function (l) { return "- [" + l.label + "](" + l.url + ")"; }).join("\n") + "\n- [Electronic press kit](" + SITE + "/epk)" + (profile.pressKit ? "\n- [Press kit (PDF)](" + SITE + profile.pressKit + ")" : "") + "\n- [Türkçe](" + SITE + "/tr)\n\n" +
    (media.photos.length ? "## Press photos\n\n" + media.photos.filter(function (p) { return p.press; }).map(function (p) { return "- [" + p.alt.en + "](" + SITE + p.download + "): © " + p.credit; }).join("\n") + "\n\n" : "") +
    "## Sets\n\n" + releases.map(function (r) { return "- [" + r.title + "](" + r.url + "): " + r.date + ", " + Math.round(r.duration / 60) + " min, " + r.genre; }).join("\n") + "\n\n" +
    "## Dates\n\n" + (upcoming.length ? upcoming.map(gigLine).join("\n") : "- No upcoming public dates announced.") + "\n\nPast:\n\n" + past.map(gigLine).join("\n") + "\n";
}

// ---------- write ----------
function write(rel, content) {
  var file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, "site"), out, { recursive: true });
LANGS.forEach(function (lang) {
  var dir = lang === "en" ? "" : lang + "/";
  write(dir + "index.html", homePage(lang));
  write(dir + "epk.html", epkPage(lang));
  write(dir + "privacy.html", simplePage(lang, "privacy", t(lang, "privacy.title"), privacyText[lang]));
  write(dir + "thanks.html", simplePage(lang, "thanks", t(lang, "thanks.title"), [t(lang, "thanks.body")],
    '  <p><a class="btn btn-ghost" href="' + localPath(lang, "") + '">' + esc(t(lang, "thanks.back")) + "</a></p>\n").replace("<head>\n", '<head>\n  <meta name="robots" content="noindex">\n'));
});
write("404.html", notFound());
write("sitemap.xml", sitemap());
write("robots.txt", robots());
write("llms.txt", llms());
console.log("built public/ (v=" + version + ")");
