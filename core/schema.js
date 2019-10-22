// Functions
let len = function(obj){
  if(typeof obj == "object"){
    let counter=0;
    for(let item in obj){
      counter++;
    }
    return counter;
  } else {
    throw new TypeError(`Object required as arg, got "${typeof obj}" instead`);
  }
}

// Lib object
const Lib = {
  verify:function(configObject,options={}){
    let strict = options.strict || false;
    return (req,res,next) => {
      if (len(req.body) != configObject.required.length && strict) {
        res.status(406).send("Invalid schema")
      } else {
        let valid = true;
        for(let key of configObject.required){
          if(req.body[key] == undefined){
            res.status(406).send("Invalid schema");
            valid=false;
          }
        }
        valid ? next() : null;
      }
    }
  }
}
module.exports = Lib;
