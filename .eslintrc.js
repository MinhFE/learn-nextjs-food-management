module.exports = {
  extends: [
    'next',
    'next/core-web-vitals',
    'plugin:prettier/recommended', // Kết hợp với Prettier
    'plugin:@tanstack/query/recommended',
  ],
  rules: {
    'prettier/prettier': ['error', { singleQuote: true }],
  },
};
