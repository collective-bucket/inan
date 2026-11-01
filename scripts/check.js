#!/usr/bin/env node
"use strict";

// Runs after build: data shape, EN/TR string parity, JSON-LD, internal links and assets in public/.
var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var pub = path.join(root, "public");
function readJson(name) { return JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8")); }

childProcess.execFileSync(process.execPath, ["--check", path.join(root, "site/assets/app.js")], { stdio: "inherit" });

var strings = require("./i18n.js");
var en = Object.keys(strings.en), tr = Object.keys(strings.tr);
en.forEach(function (k) { assert.ok(strings.tr[k], "missing tr string: " + k); });
tr.forEach(function (k) { assert.ok(strings.en[k], "missing en string: " + k); });

function bilingual(v, where) { assert.ok(v && v.en && v.tr, where + " needs en and tr"); }
function https(u, where) { assert.ok(/^https:\/\//.test(u), where + " must be an https URL"); }
function isoDate(d, where) { assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)), where + " must be YYYY-MM-DD"); }
function file(p, where) { assert.ok(fs.existsSync(path.join(root, "site", p)), where + ": missing site" + p); }

var profile = readJson("profile.json");
bilingual(profile.tagline, "profile.tagline");
bilingual(profile.city, "profile.city");
assert.ok(profile.bio.en.length && profile.bio.en.length === profile.bio.tr.length, "profile.bio en/tr paragraph counts differ");
profile.links.forEach(function (l, i) { assert.ok(l.id && l.label, "links[" + i + "]"); if (l.url) https(l.url, "links[" + i + "]"); });
if (profile.hero.image) file(profile.hero.image, "profile.hero.image");
if (profile.hero.video) file(profile.hero.video, "profile.hero.video");
if (profile.rider) bilingual(profile.rider, "profile.rider");

var releases = readJson("releases.json");
assert.ok(releases.length, "releases.json is empty");
releases.forEach(function (r, i) {
  var w = "releases[" + i + "]";
  assert.ok(r.title && r.duration > 0, w);
  assert.ok(/^https:\/\/soundcloud\.com\//.test(r.url), w + ".url must be a soundcloud.com URL");
  isoDate(r.date, w + ".date");
  file(r.artwork, w + ".artwork");
});

readJson("gigs.json").forEach(function (g, i) {
  var w = "gigs[" + i + "]";
  isoDate(g.date, w + ".date");
  assert.ok(g.venue && g.city && g.country, w + " needs venue, city, country");
  if (g.title) bilingual(g.title, w + ".title");
  if (g.tickets) https(g.tickets, w + ".tickets");
  if (g.recording) https(g.recording, w + ".recording");
});

var media = readJson("media.json");
media.photos.forEach(function (p, i) {
  var w = "media.photos[" + i + "]";
  file(p.src, w + ".src");
  bilingual(p.alt, w + ".alt");
  assert.ok(p.width && p.height, w + " needs width and height");
  assert.ok(p.credit, w + " needs a photographer credit");
});
media.videos.forEach(function (v, i) { assert.ok(v.youtubeId && v.poster, "media.videos[" + i + "]"); bilingual(v.title, "media.videos[" + i + "].title"); file(v.poster, "media.videos[" + i + "].poster"); });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function (e) {
    var p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
var files = walk(pub);
var html = files.filter(function (f) { return f.endsWith(".html"); });
function exists(urlPath) {
  var clean = urlPath.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (clean === "/") return fs.existsSync(path.join(pub, "index.html"));
  var p = path.join(pub, clean);
  return fs.existsSync(p) && fs.statSync(p).isFile() || fs.existsSync(p + ".html") || fs.existsSync(path.join(p, "index.html"));
}
html.forEach(function (f) {
  var rel = path.relative(pub, f);
  var text = fs.readFileSync(f, "utf8");
  assert.ok(!/undefined|\[object Object\]|NaN/.test(text.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")), rel + ": rendered undefined/NaN");
  assert.strictEqual((text.match(/<h1[\s>]/g) || []).length, 1, rel + ": needs exactly one <h1>");
  for (var m of text.matchAll(/(?:href|src)="(\/[^"]*)"/g)) assert.ok(exists(m[1]), rel + ": broken link " + m[1]);
  for (var id of text.matchAll(/href="#([^"]+)"/g)) assert.ok(text.includes('id="' + id[1] + '"'), rel + ": missing anchor #" + id[1]);
  for (var ld of text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    var g = JSON.parse(ld[1])["@graph"];
    assert.ok(g.some(function (n) { return n["@type"] === "Person"; }) && g.some(function (n) { return n["@type"] === "MusicGroup"; }), rel + ": JSON-LD needs Person and MusicGroup");
  }
});
["index.html", "tr/index.html"].forEach(function (p) {
  var text = fs.readFileSync(path.join(pub, p), "utf8");
  assert.ok(/<link rel="me" href="https:\/\/www\.instagram\.com\/inan\.sounds\/">/.test(text), p + ": Instagram rel=me missing");
  assert.ok(text.includes('"@type":"MusicEvent"') || !readJson("gigs.json").length, p + ": MusicEvent JSON-LD missing");
});
["robots.txt", "sitemap.xml", "llms.txt"].forEach(function (p) { assert.ok(fs.existsSync(path.join(pub, p)), "missing " + p); });

console.log("check ok: " + html.length + " pages, " + en.length + " strings, " + releases.length + " sets");
