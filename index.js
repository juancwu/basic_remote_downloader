const express = require("express");
const path = require("path");
const Master = require("./master");
const { existsSync, mkdirSync } = require("fs");
const constants = require("./constants");

const app = express();

const master = new Master();

master.on(constants.Events.child_message, (data, eventName) => {
  console.log("Event name: " + eventName);
  console.log(`Message from ${data.pid}: ${data.message}`);
});

master.on(constants.Events.child_progress, (data, eventName) => {
  process.stdout.write(`Progress: ${data.progress} (${data.pid})\r`);
});

master.on(constants.Events.child_error, (data, eventName) => {
  master.stopThread(data.pid);
  console.log("Error message: " + data.message);
  console.log(data.error);
});

master.on(constants.Events.child_completed, (data, eventName) => {
  master.stopThread(data.pid);
  console.log("Comleted message: " + data.message);
});

master.on(constants.Events.subprocess_error, (error) => {
  console.log(error);
});

master.on(constants.Events.subprocess_disconnect, () => {
  console.log(`Child process disconnected.`);
});

if (!existsSync(constants.downloadsDir)) {
  mkdirSync(constants.downloadsDir);
}

app.set("master", master);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/download", require("./routes/download"));
app.use("/schedule", require("./routes/schedule"));

app.get("/threads", (_, res) => {
  let threadPids = Object.keys(master.threads);

  res.send({ threads: threadPids });
});

app.get("/threads/stop/:pid", (req, res, next) => {
  const { pid } = req.params;

  if (!pid) return next(new Error("undefined pid"));

  let stopped = master.stopThread(pid);

  res.send({ status: `${pid} stopped: ${stopped}` });
});

app.get("/threads/kill/:pid", (req, res, next) => {
  const { pid } = req.params;

  if (!pid) return next(new Error("undefined pid"));

  let killed = master.killThread(pid);

  res.send({ status: `${pid} killed: ${killed}` });
});

app.get("/tasks", (_, res) => {
  let taskIds = Object.keys(master.tasks);

  res.send({ tasks: taskIds });
});

app.get("/tasks/stop/:id", (req, res, next) => {
  if (!req.params.id) return next(new Error("undefined task id."));

  let stopped = master.unregisterTask(req.params.id);

  res.send({ status: `${req.params.id} stopped: ${stopped}` });
});

app.get("/tasks/destroy/:id", (req, res, next) => {
  if (!req.params.id) return next(new Error("undefined task id."));

  let destroyed = master.unregisterTask(req.params.id, true);

  res.send({ status: `${req.params.id} destroyed: ${destroyed}` });
});

app.listen(constants.port, () =>
  console.log("Running on port " + constants.port)
);
