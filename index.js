const express = require("express");
const path = require("path");
const Master = require("./master");
const { existsSync, mkdirSync } = require("fs");

const app = express();

const master = new Master();

master.on("childMessage", (data) => {
  if (data.error) {
    master.stop(data.pid);
  }

  console.log(`Message from ${data.pid}: ${data.message}`);

  if (data.completed) {
    master.stop(data.pid);
  }
});

master.on("childError", (error) => {
  console.log(error);
});

master.on("childDisconnect", () => {
  console.log(`Child process disconnected.`);
});

if (!existsSync(path.join(__dirname, "downloads"))) {
  mkdirSync(path.join(__dirname, "downloads"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res, next) => {
  const query = req.query;

  if (!query.url) next(new Error("No url in query."));

  let filename =
    query.filename ?? query.url.substr(query.url.lastIndexOf("/") + 1);

  let filepath = path.join(__dirname, "downloads");

  // const curl = spawn("curl", ["-o", filepath, query.url]);

  // curl.once("error", (err) => {
  //   controller.abort();
  //   next(err);
  // });

  // curl.stdout.on("data", (data) => {
  //   console.log(data);
  // });

  // curl.stdin.on("data", console.log);

  master.start(1, {
    url: query.url,
    fileName: filename,
    directory: filepath,
    maxAttempts: 3,
  });

  res.send({ status: "running", savepath: filepath });
});

app.post("/", (req, res, next) => {
  const body = req.body;

  if (!body || !body.url)
    next(new Error("Empty body or not url field in body."));

  let filename =
    body.filename ?? body.url.substr(body.url.lastIndexOf("/") + 1);

  let filepath = path.join(__dirname, "downloads");

  // const curl = spawn("curl", ["-o", filepath, body.url]);

  // curl.on("error", (err) => {
  //   controller.abort();
  //   next(err);
  // });

  master.start(1, {
    url: query.url,
    fileName: filename,
    directory: filepath,
    maxAttempts: 3,
  });

  res.send({ status: "running", savepath: filepath });
});

app.get("/threads", (_, res) => {
  res.send(master.threads);
});

app.listen(3002, () => console.log("Running on port 3002"));
