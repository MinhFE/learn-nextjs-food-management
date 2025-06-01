module.exports = {
  extends: [
    'next',
    'next/core-web-vitals',
    'plugin:prettier/recommended', // Kết hợp với Prettier
  ],
  rules: {
    'prettier/prettier': ['error', { singleQuote: true }],
  },
};
