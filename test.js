// const isCorrupted = require("is-corrupted-jpeg");
// console.log(isCorrupted("images/users/kibira1234.jpg"))
// console.log(isCorrupted("images/users/test.jpg"))
// const jwt = require("jsonwebtoken");
// const signed = jwt.sign({"role":"admin"},"hmmSSH")
// console.log(signed)
// jwt.verify(signed,"hmmSSH",(err,docs) => {
//   if(err) console.log("Error in signature lul");
//   else console.log(docs)
// });
const hashString = str => crypto.createHash('sha1').update(str).digest('hex')
const crypto = require("crypto");
let timeStamp = Date.now().toString();
let string = (process.argv.indexOf("-string") == -1)? "somestring":process.argv[process.argv.indexOf("-string")+1]
let hashedString = `${hashString(timeStamp)}_${hashString(string)}`
console.log(hashedString);
