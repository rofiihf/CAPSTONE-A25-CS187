const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: {
    app: "./src/scripts/index.js"
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.js",
    publicPath: "/",
    clean: true
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: "babel-loader"
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/public/index.html"
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/public",
          to: ".",
          globOptions: {
            ignore: ["**/index.html"]
          }
        }
      ]
    }),
    new webpack.DefinePlugin({
      "process.env": JSON.stringify({
        API_BASE_URL: process.env.API_BASE_URL,
        NODE_ENV: "production"
      })
    })
  ],

  mode: "production"
};
