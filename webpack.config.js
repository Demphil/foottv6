// webpack.config.js
const CryptoJS = require("crypto-js");

module.exports = {
  //...
  plugins: [
    new webpack.BannerPlugin({
      banner: `
        if (typeof window.__VALID_ORIGIN__ === 'undefined' || 
            !window.location.origin.includes(window.__VALID_ORIGIN__)) {
          throw new Error('Access denied');
        }
      `,
      raw: true
    })
  ],
  output: {
    filename: 'api-[contenthash].js',
  }
};
