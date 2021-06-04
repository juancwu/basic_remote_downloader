/**
 *
 * @param {number} pid
 * @returns {boolean}
 */
module.exports = function (pid) {
  try {
    return process.kill(pid, 0);
  } catch (error) {
    return error.code === "EPERM";
  }
};
