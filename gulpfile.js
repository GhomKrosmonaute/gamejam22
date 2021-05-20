const gulp = require("gulp");
const transform = require("gulp-transform");
const csvparse = require("csv-parse/lib/sync");
const rename = require("gulp-rename");
const download = require("gulp-download-stream");
const _ = require("underscore");

// Read the name of the game from the package.json file
const PACKAGE = require("./package.json");

// Expecting a description in package.json like :
// "textAssets": {
//   "en": {
//     "spreadsheet": "1-XyjeV0XpRd7KuZ6sMCtEMu_qJpCk2tIphnGT2CHoHs",
//     "sheets": {
//       "subtitles": 0
//     }
//   }
// };

function downloadText() {
  if (!PACKAGE.textAssets)
    throw new Error(`Cannot find "textAssets" in package.json`);

  const downloadCommands = _.chain(PACKAGE.textAssets)
    .map((info, language) => {
      return _.map(info.sheets, (gid, name) => ({
        file: `${name}_${language}.tsv`,
        url: `https://docs.google.com/spreadsheets/d/${info.spreadsheet}/export?format=tsv&sheet&gid=${gid}`,
      }));
    })
    .flatten(true)
    .value();

  return download(downloadCommands).pipe(gulp.dest("text_src/"));
}
exports.downloadText = downloadText;

function convertTsvToJson(csvText) {
  const lines = csvparse(csvText, {
    columns: true,
    delimiter: "\t",
  });

  const output = {};
  for (const line of lines) {
    if (line.ID === "") continue;

    const obj = {};
    for (const key in line) {
      obj[key.toLowerCase()] = line[key];
    }
    output[line.ID] = obj;
  }

  return JSON.stringify(output, null, 2);
}

function convertTextToJson() {
  return gulp
    .src(["text_src/*.tsv"])
    .pipe(transform("utf8", convertTsvToJson))
    .pipe(rename({ extname: ".json" }))
    .pipe(gulp.dest("text/"));
}
exports.convertTextToJson = convertTextToJson;

// Meta-tasks

const downloadAndConvertText = gulp.series(downloadText, convertTextToJson);
exports.downloadAndConvertText = downloadAndConvertText;

exports.default = downloadAndConvertText;
