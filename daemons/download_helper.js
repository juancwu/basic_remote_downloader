const Downloader = require("nodejs-file-downloader");
const isRunning = require("./../utils/is_running");
const constants = require("../constants");

let pid = undefined;

process.on("message", (data) => {
  if (data.pid && typeof pid === "undefined") pid = data.pid;

  let options = {
    url: data.url,
    fileName: data.fileName,
    directory: data.directory,
  };

  if (typeof data.cloneFiles === "boolean") {
    options.cloneFiles = data.cloneFiles;
  } else {
    options.cloneFiles = true;
  }

  if (data.maxAttempts > 1) {
    options.maxAttempts = data.maxAttempts;
  } else {
    options.maxAttempts = 1;
  }

  options.shouldStop = (err) => {
    if (err.statusCode && err.statusCode >= 400) {
      return true;
    }
  };

  let downloader = new Downloader(options);

  process.send({
    message: "Download starting...",
    pid,
    eventName: constants.Events.child_message,
  });
  downloader
    .download()
    .then(() => {
      process.send({
        message: "Download completed.",
        pid,
        eventName: constants.Events.child_completed,
      });
    })
    .catch((err) => {
      process.send({
        message: "Download error.",
        error: err,
        pid,
        eventName: constants.Events.child_error,
      });
    });
});

process.on("disconnect", () => {
  if (typeof pid !== "undefined") {
    if (isRunning(pid)) {
      process.kill(pid);
    }
  }
});
