const l = console.log;
const path = require("path")

const Lib = {
  plugRouters:(routerList,app,prefix) => {
    for(let route in routerList){
      app.use(prefix+route,routerList[route])
    }
  },
  RNG:(start,end) => {
    return start+Math.floor(Math.random()*(end-start))
  },
  escapeRegExp:function(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
},cleanString:function(string){
    let alphabet = "abcdefghijklmnopqrstuvwxyz";
    let allowed = alphabet+alphabet.toUpperCase()+"1234567890_-";
    for(let char of string){
      if(allowed.indexOf(char)==-1) return false;
    }
     return true
  }
  ,resPath:loc => path.resolve(__dirname,loc)
}
module.exports = Lib
const {Cursor} = require("mongodb")
Cursor.prototype.toDocs = async function(){
  let array = [];
  while(await this.hasNext()){
    array.push(await this.next())
  }
  return array;
}
Array.prototype.isEmpty = function(){
  return (this.length==0)
}
