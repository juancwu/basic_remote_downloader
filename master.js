const events = require("events");
const { fork } = require("child_process");
const { join } = require("path");

function Master() {
  this.threads = {};
}

Master.prototype = Object.create(events.EventEmitter.prototype);
Master.prototype.constructor = Master;

/**
 * Starts a number of thread with the provided script.
 * @param {number} threadCount
 * @param {object} args
 * @param {string} args.url
 * @param {string} args.fileName
 * @param {string} args.directory
 * @param {boolean} [args.cloneFiles = true]
 * @param {number} [args.maxAttempts = 1]
 * @param {function} [args.onProcess = undefined]
 * @param {function} [args.onError = undefined]
 * @param {function} [args.onBeforeSave = undefined]
 */
Master.prototype.start = function (threadCount, args) {
  let i,
    child,
    that = this;

  const onMessage = (message) => {
    that.emit("childMessage", message);
  };

  const onError = (err) => {
    that.emit("childError", err);
  };

  const onDisconnect = () => {
    that.emit("childDisconnect");
  };

  let script = join(__dirname, "download_helper.js");

  for (i = 0; i < threadCount; i++) {
    child = fork(script);
    child.on("message", onMessage);
    child.on("error", onError);
    child.on("disconnect", onDisconnect);

    if (args) {
      args.pid = child.pid;
      child.send(args);
    }

    that.threads[child.pid] = child;
  }
};

/**
 *
 * @param {number} [pid = undefined]
 */
Master.prototype.stop = function (pid) {
  let that = this;
  if (typeof pid === "undefined") {
    let allPids = Object.keys(that.threads);
    allPids.forEach((key) => {
      if (that.threads[key].connected && !that.threads[key].killed) {
        console.log("Stopping process " + pid);
        that.threads[key].disconnect();
        delete that.threads[key];
      }
    });
  } else if (that.threads[pid]) {
    if (that.threads[pid].connected && !that.threads[pid].killed) {
      console.log("Stopping process " + pid);
      that.threads[pid].disconnect();
      delete that.threads[pid];
    }
  }
};

/**
 * ! CAUTION ! This will kill the process.
 */
Master.prototype.__kill__ = function () {
  process.kill();
};

module.exports = Master;
