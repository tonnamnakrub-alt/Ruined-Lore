import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js", "src/**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window:"readonly", document:"readonly", console:"readonly", requestAnimationFrame:"readonly", cancelAnimationFrame:"readonly", setTimeout:"readonly", clearTimeout:"readonly", setInterval:"readonly", clearInterval:"readonly", navigator:"readonly", performance:"readonly", localStorage:"readonly", Image:"readonly", devicePixelRatio:"readonly", alert:"readonly", TextEncoder:"readonly", TextDecoder:"readonly", btoa:"readonly", atob:"readonly", RTCPeerConnection:"readonly", WebSocket:"readonly" },
    },
    rules: { "no-undef": "error", "no-use-before-define": ["error", { functions: false, classes: false, variables: true }], "no-unused-vars": "off" },
  },
  {
    // สคริปต์เทส/เครื่องมือที่ root รันด้วย node ไม่ใช่เบราว์เซอร์
    // เดิม config ครอบคลุมแค่ src/** ทำให้ console/process ถูกมองว่าไม่รู้จักทั้งที่ถูกต้อง
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      // document/window โผล่ในสคริปต์ Playwright เพราะโค้ดใน p.evaluate(() => …) รันในเบราว์เซอร์จริง
      // eslint แยกบริบทตรงนั้นไม่ออก เลยต้องประกาศไว้ด้วย
      globals: {
        console: "readonly", process: "readonly", URL: "readonly", Buffer: "readonly", __dirname: "readonly",
        document: "readonly", window: "readonly", getComputedStyle: "readonly", Event: "readonly", navigator: "readonly",
      },
    },
    rules: { "no-undef": "error", "no-unused-vars": "off" },
  },
];
