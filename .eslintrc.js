module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "prettier", // Must be last to override other configs
  ],
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  rules: {
    "no-unused-vars": "off", // Turn off base rule
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^h$", // Allow unused 'h' import for Stencil JSX
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-inferrable-types": "off",
  },
  overrides: [
    {
      files: ["**/*.js"],
      parser: "espree",
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      files: ["**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        tsconfigRootDir: __dirname,
      },
      extends: [
        "eslint:recommended",
        "prettier", // Must be last to override other configs
      ],
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^h$",
          },
        ],
      },
    },
  ],
  ignorePatterns: ["dist/", "node_modules/", "*.d.ts", "coverage/", "www/", "generated/"],
};
