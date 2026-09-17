// สร้าง ruined-lore.html ไฟล์เดียว จาก src/ ทั้งหมด
// รัน:  npm run build      (หรือ  npm run watch  ให้ build ใหม่อัตโนมัติเวลาแก้ไฟล์)
import * as esbuild from "esbuild";
import fs from "fs";

const TEMPLATE = "index.template.html";
const OUT = "ruined-lore.html";

const opts = {
  entryPoints: ["src/main.jsx"],
  bundle: true,
  format: "iife",
  minify: true,
  target: ["es2019"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  write: false,
  logLevel: "info",
};

async function emit(result) {
  const js = result.outputFiles[0].text;
  const html = fs.readFileSync(TEMPLATE, "utf8").replace("/*__BUNDLE__*/", () => js);
  fs.writeFileSync(OUT, html);
  console.log(`${OUT} — ${(html.length / 1024).toFixed(0)} KB`);
}

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context({
    ...opts,
    plugins: [{ name: "emit", setup(b) { b.onEnd((r) => { if (!r.errors.length) emit(r); }); } }],
  });
  await ctx.watch();
  console.log("watching src/ ...");
} else {
  emit(await esbuild.build(opts));
}
