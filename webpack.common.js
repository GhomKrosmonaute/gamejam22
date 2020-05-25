const path = require("path");
const HtmlPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
// const ImageminPlugin = require("imagemin-webpack-plugin").default;

module.exports = {
  // //context directory is src
  // context: path.join(__dirname, "src"),

  //entry file of the project,(relative to context)
  entry: "./src/game.ts",
  output: {
    //distribution directory
    path: path.resolve(__dirname, "dist"),

    /**
     * webpack will import the file for the index.html automatically,though the js file does not exist on disk.
     * the js file will generated after webpack build the project, and the js will inserted at index.html automatically.
     * [hash:8] means unique 8 digit hash generated everytime.
     **/
    filename: "game.[hash:8].js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },

  // target: "web",

  plugins: [
    // //copy all src/assets to dist/assets
    // new CopyWebpackPlugin([{ from: "assets/", to: "assets/" }], {
    //   ignore: [],
    //   debug: "debug",
    //   copyUnmodified: true,
    // }),
    // //opimize all image file
    // new ImageminPlugin({
    //   test: /\.(jpe?g|png|gif|svg)$/i,
    //   // optipng: {
    //   //   optimizationLevel: 4
    //   // },
    //   //this way seems better on mac.
    //   pngquant: {
    //     verbose: true,
    //     quality: "80-90",
    //   },
    // }),

    //copy html to dist and insert the js reference.
    new HtmlPlugin({
      file: path.join(__dirname, "dist", "index.html"),
      template: "./index.html",
    }),
  ],
};
