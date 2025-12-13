const path = require("path");

module.exports = {
  entry: {
    app: "./src/scripts/index.js",
    widget: "./src/widget/widget.js",
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js", // app.js & widget.js
    clean: true,
    publicPath: "/",
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
      },
    ],
  },

  devServer: {
    static: [
      {
        directory: path.resolve(__dirname, "src/public"),
        publicPath: "/",
      },
      {
        directory: path.resolve(__dirname, "src/widget"),
        publicPath: "/widget",
      },
    ],
    port: 5500,
    hot: true,
    open: true,
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
