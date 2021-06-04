const cron = require("node-cron");
const events = require("events");
const constants = require("./../constants");

/**
 *
 * @param {object} options
 * @param {number} options.taskId
 * @param {boolean} options.repeat
 * @param {function} options.execution
 * @param {string} options.syntax
 */
function Task(options) {
  this._taskId = options.taskId;
  this._repeat = options.repeat;
  this._execution = options.execution;
  this._syntax = options.syntax;
  this._numExec = 0;

  this._cronTask = null;

  if (!cron.validate(this._syntax)) throw "invalid cron syntax";

  this._scheduled = false;
  this._running = false;
  this._destroyed = false;
}

Task.prototype = Object.create(events.EventEmitter.prototype);
Task.prototype.constructor = Task;

Task.prototype.init = function () {
  if (!this._cronTask) {
    this._cronTask = cron.schedule(this._syntax, handler.call(this, this), {
      scheduled: true,
    });

    this._scheduled = true;
    this.emit(constants.Events.task_scheduled, this);
  }
};

Task.prototype.stop = function (id) {
  if (!id) id = this._taskId;
  if (this._cronTask) {
    this._cronTask.stop();
    this._running = false;
    this._scheduled = false;
    this.emit(constants.Events.task_stopped, id);
  }
};

Task.prototype.start = function (id) {
  if (!id) id = this._taskId;
  if (this._cronTask) {
    this._cronTask.start();
    this._running = false;
    this._scheduled = true;
    this.emit(constants.Events.task_started, id);
  }
};

Task.prototype.destroy = function (id) {
  if (!id) id = this._taskId;
  if (this._cronTask) {
    this._cronTask.destroy();
    this._destroyed = true;
    this._running = false;
    this._scheduled = false;
    this.emit(constants.Events.task_destroyed, id);
  }
};

/**
 *
 * @param {Task} scope
 */
const handler = function (scope) {
  if (!(this instanceof Task) && !(scope instanceof Task))
    throw "Please bind Task instance to the hanler function or provide scope argument.";

  let that = this instanceof Task ? this : scope;

  return function () {
    // destroy cronTask for one time task
    if (!that._repeat && that._numExec > 0 && !that._running) {
      that.destroy(that._taskId);
      return;
    }

    if (!that._running) {
      // execute scheduled task
      that._running = true;
      that.emit(constants.Events.task_running, that._taskId);
      let download_wrapper = that._execution(that._taskId);

      download_wrapper.on(constants.Events.download_progress, (p, c, r, id) => {
        that.emit(constants.Events.task_progress, p, c, r, id);
      });

      download_wrapper.on(constants.Events.download_completed, (id) => {
        that._running = false;
        that.emit(constants.Events.task_completed, id);
        if (!that._repeat && that._numExec > 0 && !that._running) {
          that.destroy(id);
        }
      });

      download_wrapper.on(constants.Events.download_error, (e, id) => {
        that._running = false;
        that.emit(constants.Events.task_error, e, id);
      });

      download_wrapper.on(
        constants.Events.download_before_complete,
        (deductedName) => {
          that.emit(
            constants.Events.task_before_complete,
            deductedName,
            that._taskId
          );
        }
      );

      download_wrapper.on(constants.Events.download_stopped, (id) => {
        that.stop(id);
      });

      download_wrapper.download();

      that._numExec += 1;
    }
  };
};

module.exports = Task;
