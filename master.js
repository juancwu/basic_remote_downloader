const events = require("events");
const { fork } = require("child_process");
const isRunning = require("./utils/is_running");
const constants = require("./constants");
const Task = require("./models/Task");

function Master() {
  this.threads = {};
  this.tasks = {};
}

Master.prototype = Object.create(events.EventEmitter.prototype);
Master.prototype.constructor = Master;

/**
 * Starts a number of thread with the provided script.
 * @param {number} threadCount
 * @param {object} args
 * @param {string} [args.url]
 * @param {string} [args.fileName]
 * @param {string} [args.directory]
 * @param {boolean} [args.cloneFiles = true]
 * @param {number} [args.maxAttempts = 1]
 * @param {function} [args.onProcess = undefined]
 * @param {function} [args.onError = undefined]
 * @param {function} [args.onBeforeSave = undefined]
 * @param {string} [args.syntax]
 * @param {function} [args.execution]
 * @param {boolean} [args.repeat = false]
 * @param {string} script
 */
Master.prototype.startThread = function (threadCount, args, script) {
  let i,
    child,
    that = this;

  const onMessage = (data) => {
    // see constants file for all the defined events.
    that.emit(data.eventName, data, data.eventName);
  };

  const onError = (err) => {
    that.emit(constants.Events.subprocess_error, err);
  };

  const onDisconnect = () => {
    that.emit(constants.Events.subprocess_disconnect);
  };

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
 * Gracefully terminates a child process.
 * @param {number} [pid = undefined]
 */
Master.prototype.stopThread = function (pid) {
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

    return true;
  } else if (that.threads[pid]) {
    if (that.threads[pid].connected && !that.threads[pid].killed) {
      console.log("Stopping process " + pid);
      that.threads[pid].disconnect();
      delete that.threads[pid];
    }

    return true;
  }

  return false;
};

/**
 * Kills running child process ungracefully.
 * ! Use stopThread method to terminate gracefully.
 * @param {number} pid
 * @returns {boolean}
 */
Master.prototype.killThread = function (pid) {
  if (this.threads[pid] && isRunning(pid)) {
    process.kill(pid);
    return true;
  }

  return false;
};

/**
 * Register a Task and listens to all events emitted by a Task Object.
 * @param {string} taskId
 * @param {Task} Task
 */
Master.prototype.registerTask = function (taskId, Task) {
  let that = this;

  const onProgess = (percentage, _, remaining, id) => {
    that.emit(
      constants.Events.child_progress,
      {
        progress: `${percentage}%  -  ${remaining}`,
        pid: id,
      },
      constants.Events.task_progress
    );
  };

  const onCompleted = (id) => {
    console.log(`\nTask completed: ${id}`);
  };

  const onError = (err, id) => {
    console.log(`Task error: ${err} - ${id}`);
    that.unregisterTask(id, true);
  };

  const onBeforeComplete = (filename, id) => {
    that.emit(
      constants.Events.child_message,
      {
        message: `saving file with filename: ${filename}`,
        pid: id,
      },
      constants.Events.task_before_complete
    );
  };

  const onStopped = (id) => {
    console.log(`Task stopped ${id}`);
  };

  const onDestroyed = (id) => {
    console.log(`Task destroyed ${id}`);
    that.cleanTask(id);
  };

  const onStarted = (id) => {
    that.emit(
      constants.Events.child_message,
      {
        message: `Task started ${id}`,
        pid: id,
      },
      constants.Events.task_started
    );
  };

  const onRunning = (id) => {
    that.emit(
      constants.Events.child_message,
      {
        message: `Task running ${id}`,
        pid: id,
      },
      constants.Events.task_running
    );
  };

  const onScheduled = (_task) => {
    that.emit(
      constants.Events.child_message,
      {
        message: `Task scheduled ${_task}`,
        pid: _task._taskId,
      },
      constants.Events.task_scheduled
    );
  };

  Task.on(constants.Events.task_completed, onCompleted);
  Task.on(constants.Events.task_scheduled, onScheduled);
  Task.on(constants.Events.task_destroyed, onDestroyed);
  Task.on(constants.Events.task_progress, onProgess);
  Task.on(constants.Events.task_error, onError);
  Task.on(constants.Events.task_before_complete, onBeforeComplete);
  Task.on(constants.Events.task_stopped, onStopped);
  Task.on(constants.Events.task_started, onStarted);
  Task.on(constants.Events.task_running, onRunning);

  // initialized Task
  // here is where the cron schedule actually happens;
  Task.init();

  that.tasks[taskId] = Task;
};

/**
 * Unregister a task or all tasks. By unregistering a task,
 * it will only stop the task(s) but not destroy it/them.
 * The tasks will still be stored in memory.
 * To unregister and destroy, pass destroy as true default is false.
 * @param {string} [taskId]
 * @param {boolean} [destroy = false]
 */
Master.prototype.unregisterTask = function (taskId, destroy = false) {
  let that = this;

  if (destroy) console.log("Unregister and destroy mode enabled.");

  if (typeof taskId === "undefined") {
    // unregister all tasks
    let allTasksIds = Object.keys(this.tasks);

    allTasksIds.forEach((_id) => {
      if (that.tasks[_id] && !that.tasks[_id]._destroyed) {
        console.log("Unregistering task " + _id);
        if (destroy) {
          that.destroyTask(_id);
        } else if (that.tasks[_id]._scheduled) {
          that.tasks[_id].stop(_id);
        }
      }
    });

    return true;
  } else if (this.tasks[taskId]) {
    if (!this.tasks[taskId]._destroyed) {
      console.log("Unregistering task " + taskId);
      if (destroy) {
        that.destroyTask(taskId);
      } else if (that.tasks[taskId]._scheduled) {
        that.tasks[taskId].stop(taskId);
      }
    }

    return true;
  }

  return false;
};

/**
 * ! Destroy task. Running or stopped, it will be destroyed.
 * @param {string} taskId
 */
Master.prototype.destroyTask = function (taskId) {
  if (this.tasks[taskId]) {
    if (!this.tasks[taskId]._destroyed) {
      console.log("Destroying task " + taskId);
      this.tasks[taskId].destroy();
    }
    delete this.tasks[taskId];
  }
};

Master.prototype.cleanTask = function (taskId) {
  if (this.tasks[taskId] && this.tasks[taskId]._destroyed) {
    console.log(`Cleaning task ` + taskId);
    delete this.tasks[taskId];
  }
};

/**
 * ! CAUTION ! This will kill the process.
 */
Master.prototype.__kill__ = function () {
  process.kill();
};

module.exports = Master;
