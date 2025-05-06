const path = require('path');
const webpack = require('webpack');
const CryptoJS = require('crypto-js');

// 1. تكوين المشفر
const SECRET_KEY = 'your-secret-key-123';
const encryptCode = (code) => {
  return CryptoJS.AES.encrypt(code, SECRET_KEY).toString();
};

module.exports = {
  entry: './src/api.js', // ملف المصدر
  mode: 'production',
  output: {
    filename: 'api-[contenthash].js', // اسم الملف الناتج مع hash
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    // 2. إضافة تحقق الأمان
    new webpack.BannerPlugin({
      banner: `
        if (typeof window.__VALID_ORIGIN__ === 'undefined' || 
            !window.location.origin.includes(window.__VALID_ORIGIN__)) {
          throw new Error('Access denied');
        }
      `,
      raw: true,
      entryOnly: true
    }),

    // 3. تشفير المحتوى
    {
      apply: (compiler) => {
        compiler.hooks.emit.tap('EncryptPlugin', (compilation) => {
          for (const file of Object.keys(compilation.assets)) {
            if (file.startsWith('api-')) {
              const content = compilation.assets[file].source();
              const encrypted = encryptCode(content);
              compilation.assets[file] = {
                source: () => `eval(CryptoJS.AES.decrypt("${encrypted}", "${SECRET_KEY}").toString(CryptoJS.enc.Utf8))`,
                size: () => encrypted.length
              };
            }
          }
        });
      }
    }
  ]
};
