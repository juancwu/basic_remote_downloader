const { join } = require("path");

const scripts = {
  download_helper: join(__dirname, "daemons", "download_helper.js"),
};

const downloadsDir = join(__dirname, "downloads");

const Events = {
  // events emitted through the child.on('message') channel.
  child_message: "child_message",
  child_progress: "child_progress",
  child_completed: "child_completed",
  child_error: "child_error",
  // * --
  // event emitted when child.on('error') channel.
  subprocess_error: "subprocess_error",
  // event emitted in child.on('disconnect') channel.
  subprocess_disconnect: "subprocess_disconnect",
  // events emitted by a Task object.
  task_completed: "task_completed",
  task_scheduled: "task_scheduled",
  task_destroyed: "task_destroyed",
  task_progress: "task_progress",
  task_error: "task_error",
  task_before_complete: "task_before_complete",
  task_stopped: "task_stopped",
  task_started: "task_started",
  task_running: "task_running",
  // events emitted by scheduled download
  download_error: "download_error",
  download_completed: "download_completed",
  download_progress: "download_progress",
  download_stopped: "download_stopped",
  download_cancelled: "download_cancelled",
  download_paused: "download_paused",
  download_resumed: "download_resumed",
  download_before_complete: "download_before_complete",
};

const port = 3003;

module.exports = {
  scripts,
  downloadsDir,
  Events,
  port,
};
