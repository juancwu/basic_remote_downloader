/**
 *
 * @param {function} fn
 * @returns {Promise<T>}
 */
module.exports = function (fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      const cb = function (err, ...results) {
        if (err) return reject(err);

        return resolve(results.length === 1 ? results[0] : results);
      };
      args.push(cb);
      fn(...args);
    });
  };
};
