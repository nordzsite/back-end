const l = console.log;
const path = require("path")

const Lib = {
  randGen:function randGen(len) {
    let alphabets = "abcdefghijklmnopqrstuvwxyz";
    let charset = alphabets+alphabets.toUpperCase()+'0123456789';
    let final = "";
    for(let i = 0;i < len;i++){
      final+= charset[Math.floor(Math.random()*charset.length)]
    }
    return final
  },
  CONSTANTS:{
    emailValidationExpression:/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  },
  CustomError:function(errname,errmsg){
    let err = new Error(errmsg);
    err.name = errname;
    return err
  },
  plugRouters:(routerList,app,prefix) => {
    for(let route in routerList){
      app.use(prefix+route,routerList[route])
    }
  },
  simpleBindViews:(app,viewObject,callback,viewPath) => {
    if (typeof viewPath == "undefined") throw new Lib.CustomError("ViewError","View path directory needs to be specified")
    else {
      for(let view in viewObject){
        app.get(view,(request,response) => {
          response.sendFile(path.resolve(process.cwd(),viewPath)+"/"+callback(request,view,viewObject[view]))
          // response.send("oi wait up");
          // console.log(path.resolve(process.cwd(),viewPath))
          // console.log(process.cwd())
        })
      }
    }
  },
  RNG:(start,end) => {
    return start+Math.floor(Math.random()*(end-start))
  },
  escapeRegExp:(e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
,cleanString:function(string){
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
