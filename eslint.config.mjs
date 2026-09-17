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
];
