const fs=require("fs");
const colors = require('colors');
const args = process.argv;
function randGen(len){
  let alphabets = 'abcdefghijklmnopqrstuvwxyz';
  let chars = alphabets+alphabets.toUpperCase()+'0123456789';
  let str = '';
  for(i=0;i<len;i++){
    str+=chars[Math.floor(Math.random()*(chars.length))];
  }
  return str;
}
if (args.indexOf("-setkey") != -1) {
  if (args[args.indexOf("-setkey")+1]==undefined) {
    console.log("Error: key required")
  } else {
    let key = args[args.indexOf("-setkey")+1];
    let json = JSON.parse(fs.readFileSync('keys.json').toString());
    let length = (args[args.indexOf("-len")+1] != -1) ? 50 : args[args.indexOf("-len")+1];
    json[key] = (args.indexOf("-key") != -1)? args[args.indexOf("-key")+1]:randGen(length);
    console.log(`Key '${key}' assigned as '${json[key]}'`);
    fs.writeFileSync("keys.json",JSON.stringify(json,undefined,3));
  }
} else if (args.indexOf("-listkeys")!=-1){
  let json = JSON.parse(fs.readFileSync('keys.json').toString());
  console.log("Keys assigned to 'keys.json'".bold);
  for(key in json){
    console.log(`${key} = ${json[key]}`);
  }
} else if (args.indexOf("-delkey")) {
  if (args[args.indexOf("-delkey")+1] == "" || args[args.indexOf("-delkey")+1] == undefined) {
    console.log("Error: key required");
  } else {
    let json = JSON.parse(fs.readFileSync("keys.json").toString())
    let key = args[args.indexOf("-delkey")+1]
    if (json[key] == undefined) {
      console.log("Error: Specified key not found");
    } else {
      console.log(`Are you sure you want to delete key '${key}'? This cannot be undone(y/n)`);
      process.stdin.on("data",function(data){
        data = data.toString();
        if(data.trim() == 'y'){
          delete json[key];
          fs.writeFileSync('keys.json',JSON.stringify(json,undefined,3));
          console.log(`Key '${key}' successfully removed`);
          process.exit(0);
        } else if (data.trim()=='n') {
          console.log(`Cancelled deletion of key '${key}'`)
          process.exit(0);
        } else {
          console.log(`Incorrect input '${data}' given, y or n accepted only`)
        }
      })
    }
  }
}
module.exports.randGen = randGen;
