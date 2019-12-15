const l = console.log;
const path = require("path")
const multer = require("multer");
const fs = require('fs');
const crypto = require('crypto');
const Lib = {
  hashString:(str,algorithm='sha1') => crypto.createHash(algorithm).update(str.toString()).digest('hex'),
  uniqueIdGen:(len=5) => `${Lib.hashString(Date.now())}_${Lib.randGen(len)}`,
  simpleApplyTemplate:(string,object) => {
    let finalString = string;
    for(let variable in object){
      let expression = new RegExp(Lib.escapeRegExp("${"+variable+"}"),"g")
      finalString = finalString.replace(expression,object[variable]);
    }
    return finalString;
  },
  randGen:function randGen(len) {
    let alphabets = "abcdefghijklmnopqrstuvwxyz";
    let charset = alphabets+alphabets.toUpperCase()+'0123456789';
    let final = "";
    for(let i = 0;i < len;i++){
      final+= charset[Math.floor(Math.random()*charset.length)]
    }
    return final
  },
  root:{
    setAsMainRoot:function(){
      global.ROOT = process.cwd()
    },
    root:function(loc){
      return path.resolve(global.ROOT,loc)
    }
  },
  CONSTANTS:{
    emailValidationExpression:/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  },
  functions:{
    handleInternalServerErrors:function(res,showError=false){
      return (err) => {
        if(showError) res.status(500).send(err.toString());
        else res.status(500).send("Internal server error");
        console.error(err)
      }
    },
    handleMulterErrors:function(res,err){
      if(err instanceof multer.MulterError){
        if(err.message == "Unexpected field"){
          res.status(401).send("Invalid field sent")
        }
        else {
          res.status(500).send("Internal server error")
          console.log(err)
        }
      } else {
        res.status(500).send("Internal server error")
        console.log(err)
      }
    },
  },
  bindLogging:function(boolean){
    return boolean ? console.log : function(){}
  },
  middleware:{
    loginRequired:(req,res,next) => {
      if(typeof req.session.uid == 'undefined') res.status(403).json({message:"Need to be logged in to access resource",code:403})
      else next()
    },
    loginRequired403:(req,res,next) => {
      if(typeof req.session.uid == 'undefined') res.status(403).sendFile(path.resolve(__dirname,"../public/front-end/public/private/403.html"))
      else next()

    },
    allowRoles:(roles) => {
      return (req,res,next) => {
        if(!roles.includes(req.session.type)) res.status(403).send({message:`Only roles "${roles.join(",")}" allowed`,code:403});
        else next()
      }
    }
  },
  /*
    TODO:
      - Extend DependencyInjector:
        - Allow for manual dependency names if arg 'core' = true
        - Possibly convert 'dependencies' non-static variable into object instead of Array
  */
  DependencyInjector:class {
    constructor(config){
      let {dependencies} = config;
      if(!dependencies.every(e=>typeof e =="string")) throw new TypeError("All the dependencies have to be of type string")
  		else {
        let packageArray = [];
        for(let dependency in (config.npmPackage.dependencies || {})) {
          packageArray.push(dependency)
        }
        this.dependencies = [...dependencies,...packageArray]
      }
    }
  	serialize(){
          let obj = {};
          let arr = this.dependencies.map(e=>"/"+e)
          for(let dependency of arr){
              let importantBit = dependency.match(/(\/.+)$/g)[0].split(/-|_| /g).map((e,index)=>(index>=1)?e[0].toUpperCase()+e.substring(1):e).join('').replace(/\//g,'');
        			dependency = dependency.substring(1);
        			obj[importantBit] = require(dependency);
          }
      		return obj
      }
    init(){
      let obj = this.serialize();
      for(let dependency in obj) global[dependency] = obj[dependency]
    }
  }
  ,
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
  bindRoutersToDir:(dir,app,prefix) => {
    let files = fs.readdirSync(dir);
    let finalRouterArray = files.filter((e) => {
      return (path.parse(e).ext == ".js")
    }).map(e=>path.resolve(process.cwd(),`./${dir}${path.parse(e).name}`))
    for(let route of finalRouterArray) app.use(`${prefix}${path.parse(route).name}`,require(route))
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
  ,resPath:loc => path.resolve(process.cwd(),loc)
}
module.exports = Lib
const {Cursor} = require("mongodb")
Cursor.prototype.toDocs = async function(){
  let array = [];
  while(await this.hasNext()){
    array.push(await this.next())
  }
  this.close()
  return array;
}
Array.prototype.isEmpty = function(){
  return (this.length==0)
}
Array.prototype.lastElem = function(){
  return this[this.length-1]
}
Date.prototype.resolveDate = function(){
  let date = this.getDate();
  let lastDigit = date%10;
  let concatString = ""
  switch (lastDigit) {
    case 1:
      concatString = "st"
      break;
    case 2:
      concatString = "nd"
      break;
    case 3:
      concatString = "rd"
      break;
    default:
      concatString = "th"
      break
  }
  return date+concatString
}
Date.prototype.getSemiSimpleTime = function() {
  return `${this.getSimpleTime()}  ${this.getHours()}:${this.getMinutes()}:${this.getSeconds()}`
}
Date.prototype.getSimpleTime = function(){
  let days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  let months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let day = days[this.getDay()];
  let month = months[this.getMonth()];
  return `${day}, ${month} ${this.resolveDate()}, ${this.getFullYear()}`
}
