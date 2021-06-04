const router = require("express").Router();
const Task = require("./../models/Task");
const random = require("./../utils/random");
const constants = require("./../constants");
const Downloader = require("nodejs-file-downloader");
const events = require("events");

router.post("/", async (req, res, next) => {
  try {
    if (typeof req.body === "undefined")
      return next(new Error("Must provide body in request"));

    if (!req.body.syntax) return next(new Error("Missing schedule syntax"));
    if (!req.body.url) return next(new Error("Missing url"));
    let filename;
    if (!req.body.filename)
      filename = req.body.url.substr(req.body.url.lastIndexOf("/") + 1);
    else filename = req.body.filename;

    if (!("repeat" in req.body)) req.body.repeat = false;

    let taskId = await random.randomString(12);

    const options = {
      taskId,
      repeat: req.body.repeat,
      syntax: req.body.syntax,
      execution: (_taskId) => {
        function Wrapper(_id) {
          let that = this;

          this.id = _id;

          this.downloader = new Downloader({
            url: req.body.url,
            fileName: filename,
            directory: constants.downloadsDir,
            cloneFiles: true,
            maxAttempts: 1,
            onError(e) {
              that.emit(constants.Events.download_error, e, that.id);
            },
            onProgress(p, c, r) {
              that.emit(constants.Events.download_progress, p, c, r, that.id);
            },
            onBeforeSave(deductedName) {
              that.emit(
                constants.Events.download_before_save,
                deductedName,
                that.id
              );
            },
            shouldStop(e) {
              if (e.statusCode && e.statusCode >= 400) {
                that.emit(constants.Events.download_stopped, that.id);
                return true;
              }

              return false;
            },
          });
        }

        Wrapper.prototype = Object.create(events.EventEmitter.prototype);
        Wrapper.prototype.constructor = Wrapper;

        Wrapper.prototype.download = function () {
          let that = this;
          this.downloader
            .download()
            .then(() => {
              that.emit(constants.Events.download_completed, that.id);
            })
            .catch((e) =>
              that.emit(constants.Events.download_error, e, that.id)
            );
        };

        return new Wrapper(_taskId);
      },
    };
    const task = new Task(options);

    req.app.get("master").registerTask(taskId, task);

    res.send({ scheduled: task._scheduled, taskId: task._taskId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
