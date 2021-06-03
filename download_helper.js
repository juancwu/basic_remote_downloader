const Downloader = require("nodejs-file-downloader");

let pid = undefined;

process.on("message", (data) => {
  if (data.pid) pid = data.pid;

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
    if (err.statusCode && err.statusCode === 404) {
      return true;
    }
  };

  let downloader = new Downloader(options);

  process.send({
    message: "Download starting...",
    error: null,
    pid,
  });
  downloader
    .download()
    .then(() => {
      process.send({
        message: "Download completed.",
        error: null,
        completed: true,
        pid,
      });
    })
    .catch((err) => {
      process.send({
        message: "Download error.",
        error: err,
        pid,
        completed: false,
      });
    });
});

process.on("disconnect", () => {
  if (typeof pid !== "undefined") {
    process.kill(pid);
  }
});
