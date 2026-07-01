import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { allPhotoTargets, pilotTargets } from "../data/photo-sourcing-targets.mjs";

const commonsApi = "https://commons.wikimedia.org/w/api.php";
const outputRoot = "data/photo-sources";
const sampleRoot = "web/public/assets/demo-scenes/real-samples";
const allowedLicenses = new Set(["cc-by-sa-4.0", "cc-by-sa-3.0", "cc-by-4.0", "cc-by-3.0", "cc0", "pd"]);

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normaliseLicense(value = "") {
  return value.toLowerCase().replace(/_/g, "-");
}

function apiUrl(params) {
  const search = new URLSearchParams({
    format: "json",
    origin: "*",
    ...params,
  });
  return `${commonsApi}?${search.toString()}`;
}

async function searchFiles(query, limit = 5) {
  const response = await fetch(
    apiUrl({
      action: "query",
      generator: "search",
      gsrnamespace: "6",
      gsrlimit: String(limit),
      gsrsearch: `${query} filetype:bitmap`,
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime",
      iiurlwidth: "1200",
    }),
  );
  if (!response.ok) throw new Error(`Commons search failed for ${query}: ${response.status}`);
  const data = await response.json();
  return Object.values(data.query?.pages || {})
    .map((page) => {
      const info = page.imageinfo?.[0] || {};
      const meta = info.extmetadata || {};
      const license = normaliseLicense(meta.LicenseShortName?.value || meta.License?.value || "");
      return {
        title: page.title,
        pageUrl: meta.ObjectName?.value
          ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(meta.ObjectName.value.replace(/^File:/, ""))}`
          : `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
        imageUrl: info.url,
        thumbUrl: info.thumburl || info.url,
        mime: info.mime,
        license,
        licenseUrl: meta.LicenseUrl?.value || "",
        author: meta.Artist?.value?.replace(/<[^>]+>/g, "").trim() || "",
        credit: meta.Credit?.value?.replace(/<[^>]+>/g, "").trim() || "",
      };
    })
    .filter((item) => item.mime?.startsWith("image/"))
    .filter((item) => !item.license || allowedLicenses.has(item.license));
}

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: ${url}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(path));
}

async function main() {
  const mode = process.argv.includes("--all") ? "all" : "pilot";
  const shouldDownload = process.argv.includes("--download-samples");
  const targets = mode === "all" ? allPhotoTargets.map((target) => target.query) : pilotTargets;
  await mkdir(outputRoot, { recursive: true });
  await mkdir(sampleRoot, { recursive: true });

  const results = [];
  for (const query of targets) {
    console.log(`Searching ${query}`);
    const candidates = await searchFiles(query);
    results.push({
      query,
      best: candidates[0] || null,
      candidates,
    });
    if (shouldDownload && candidates[0]?.thumbUrl) {
      const ext = basename(new URL(candidates[0].thumbUrl).pathname).split(".").pop() || "jpg";
      try {
        await download(candidates[0].thumbUrl, join(sampleRoot, `${slugify(query)}.${ext}`));
      } catch (error) {
        console.warn(`Sample download skipped for ${query}: ${error.message}`);
      }
    }
  }

  const outputPath = join(outputRoot, `${mode}-commons-results.json`);
  await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), mode, results }, null, 2));
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
