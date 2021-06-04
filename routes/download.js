const router = require("express").Router();
const constants = require("./../constants");

router.get("/", (req, res, next) => {
  const query = req.query;

  if (!query.url) next(new Error("No url in query."));

  let filename =
    query.filename ?? query.url.substr(query.url.lastIndexOf("/") + 1);

  res.app.get("master").startThread(
    1,
    {
      url: query.url,
      fileName: filename,
      directory: constants.downloadsDir,
      maxAttempts: 3,
    },
    constants.scripts.download_helper
  );

  res.send({ status: "running", savepath: constants.downloadsDir });
});

router.post("/", (req, res, next) => {
  const body = req.body;

  if (!body || !body.url)
    next(new Error("Empty body or not url field in body."));

  let filename =
    body.filename ?? body.url.substr(body.url.lastIndexOf("/") + 1);

  res.app.get("master").startThread(
    1,
    {
      url: query.url,
      fileName: filename,
      directory: constants.downloadsDir,
      maxAttempts: 3,
    },
    constants.scripts.download_helper
  );

  res.send({ status: "running", savepath: constants.downloadsDir });
});

module.exports = router;
