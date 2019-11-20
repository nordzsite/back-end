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
let getFirstIndexOfObj = obj => Object.keys(obj)[0]
// Lib object
const Lib = {
  fields: function(){
    return Lib.verify({required:arguments})
  },
  verify:function(configObject,options={}){
    let strict = options.strict || false;
    return (req,res,next) => {
      if (len(req.body) != configObject.required.length && strict) {
        res.status(406).send("Invalid schema")
      } else {
        let valid = true;
        for(let key of configObject.required){
          if (typeof key == 'object') {
            let reqKey = getFirstIndexOfObj(key)
            if (req.body[reqKey] == undefined) {
              res.status(406).send("Invalid schema");
              valid=false;
              break;
            } else if (typeof key[reqKey] == 'string'){
              let range = key[reqKey];
              // TODO: FIX BIG BUG SOMEWHERE HERE
              if (/[0-9]*-[0-9]*/gi.test(range)) {
                let splitUp = range.split('-');
                range = [splitUp[0],splitUp[1]]
              } else if(/[0-9]+\+/gi.test(range)){
                let value = Number(range.match(/[0-9]+\+/gi)[0].replace(/\D/,''));
                range = [value,null]
              } else if (/[0-9]+-/.test(range)){
                let value = Number(range.match(/[0-9]+-/gi)[0].replace(/\D/,''))
                range = [0,value]
              } else if(/[0-9]+/.test(range)) {
                range = [Number(range),null]
              } else {
                throw new TypeError("Invalid Format given to middleware verification: "+range)
              }
              let invalidSchemaString = `Invalid schema: field "${reqKey}" has to have length in range ${(range[1] == null) ? `${range[0]} and above` : `${range[0]}-${range[1]}`}`
              if (range[1] == null) {
                if(req.body[reqKey].length < range[0]) {
                  res.status(406).send(invalidSchemaString);
                  valid = false;
                  break;
                }
              } else {
                if(req.body[reqKey].length < range[0] || req.body[reqKey].length > range[1]){
                  console.log(range[0])
                  res.status(406).send(invalidSchemaString);
                  valid = false;
                  break;
                }
              }
            }
            else if (key[reqkKey] instanceof Array){
              if (key[reqKey].indexOf(req.body[reqKey])) {
                res.status(406).send(`Invalid schema: Field "${reqKey}" only accepts: \n${key[reqKey].join("\n- ")}`)
                valid=false;
                break;
              }
            }
          } else if(req.body[key] == undefined){
            res.status(406).send("Invalid schema");
            valid=false;
            break;
          }
        }
        valid ? next() : null;
      }
    }
  }
}
module.exports = Lib;
