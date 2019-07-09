const chmodr = require('chmodr')

module.exports = async (path, perm) => {
  return new Promise((resolve, reject) => {
    chmodr(path, perm, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
