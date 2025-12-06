const path = require("path");

module.exports = {
  entry: "./src/scripts/index.js", // sesuaikan dengan entry project kamu
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      }
    ],
  },

  devServer: {
    static: {
      directory: path.join(__dirname, "src", "public"), // folder HTML kamu
    },
    port: 5500,
    hot: true,
    open: true,

    // 🔥 BAGIAN TERPENTING: PROXY
    proxy: [
      {
        context: ["/api", "/chat"],
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    ],
  },
  mode: "development",

  
};
