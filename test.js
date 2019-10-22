// const isCorrupted = require("is-corrupted-jpeg");
// console.log(isCorrupted("images/users/kibira1234.jpg"))
// console.log(isCorrupted("images/users/test.jpg"))
const jwt = require("jsonwebtoken");
const signed = jwt.sign({"role":"admin"},"hmmSSH")
console.log(signed)
jwt.verify(signed,"hmmSSH",(err,docs) => {
  if(err) console.log("Error in signature lul");
  else console.log(docs)
});
