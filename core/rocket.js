const fs = require("fs");
// const dir = __dirname;
const {exec} = require("child_process")
function dir(){
  return process.cwd()
}
let rocket = {
  tools:function tools(req,res,next){
    res.file = function(path){
      res.sendFile(dir()+"/"+path);
    }
    next();
  },
  utils:{
    randGen:function randGen(len){
      let alphabets = "abcdefghijklmnopqrstuvwxyz";
      let charset = alphabets+alphabets.toUpperCase()+'0123456789';
      let string = "";
      for(let i=0;i<len;i++){
        string += charset[Math.floor(Math.random()*charset.length)]
      }
      return string
    }
  },
  logger:function Logger(req,res,next){
    Date.prototype.getWeekDay = function(){
      let days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      return days[this.getDay()]
    }
    let date = new Date();
    let weekday = date.getWeekDay();
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    let method = req.method;
    let ip = req.ip;
    let path = req.path;
    console.log(`[${ip}]  <([${day}/${month}/${year}] [${hours}:${minutes}:${seconds}] [${weekday}])>  {${method} => "${path}"}`);
    next()
  },
  launcher:function(){
    // this.set('port',5000)
    console.log(this.set);
    let port = this.address().port;
    let host = this.address().address;
    console.log(`WebServer listening on http://${host}:${port}`);

    exec("ipconfig getifaddr en0",function(err,stdout,stderr){
      if(err) console.error(err);
      else {
        console.log(`Webserver Listening on http://${host}:${port} @ http://${stdout.trim()}:${port}`);
        console.log("Registered routes: ");
        this._router.stack.forEach(function(e){
          if(typeof e.route != "undefined"){
            console.log(`* [${Object.keys(e.route.methods).map(e=>e.toUpperCase()).join(", ")}]  => "${e.route.path}"`);
          }
        });
        console.log("\n\n\n** Logs would appear here **");
      }
      })

  },
  launch:function(app,config,callback=function(){}){
    /*app.use(function(req,res,next){
      Date.prototype.getWeekDay = function(){
        let days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        return days[this.getDay()]
      }
      let date = new Date();
      let weekday = date.getWeekDay();
      let day = date.getDate();
      let month = date.getMonth();
      let year = date.getFullYear();
      let hours = date.getHours();
      let minutes = date.getMinutes();
      let seconds = date.getSeconds();
      let method = req.method;
      let ip = req.ip;
      let path = req.path;
      // console.log(`[${ip}]  <([${day}/${month}/${year}] [${hours}:${minutes}:${seconds}] [${weekday}])>  {${method} => "${req}"}`);
      console.log(req)
      next();
    });*/
    let port = config.port||10000;
    let host = config.host||"0.0.0.0";
    let args = process.argv;
    if (args.includes("-port")) {
      let value = args[args.indexOf("-port")+1];
      if (!isNaN(value)) {
        port = value
      } else {
        throw new TypeError("Port must be a number!")
      }
    }
    if (args.includes("-host")) {
      let value = args[args.indexOf("-host")+1];
      host = value
    }
    let stackdefined = false
    /*app._router.stack.forEach(function(e){
      if(typeof e.route != "undefined"){
        // console.log(`* [${Object.keys(e.route.methods).map(e=>e.toUpperCase()).join(", ")}]  => "${e.route.path}"`);
        stackdefined = true
      }
      else if(stackdefined){
        app._router.stack.splice(app._router.stack.indexOf(e),1)
        app._router.stack.splice(1, 0, e);
      }
    });*/
    app.listen(port,host,function(){
      exec("ipconfig getifaddr en0",function(err,stdout,stderr){
        callback();
        if(err) console.error(err);
        else {
          console.log(`Webserver Listening on http://${host}:${port} @ http://${stdout.trim()}:${port}`);
          console.log("Registered routes: ");
          app._router.stack.forEach(function(e){
            if(typeof e.route != "undefined"){
              console.log(`* [${Object.keys(e.route.methods).map(e=>e.toUpperCase()).join(", ")}]  => "${e.route.path}"`);
            }
          });
          console.log("\n\n\n** Logs would appear here **");
        }
      })

    })
  }
};
module.exports = rocket;
