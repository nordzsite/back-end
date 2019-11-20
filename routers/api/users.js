const express = require('express')
const isCorrupted = require("is-corrupted-jpeg")
const router = express.Router();
const lib = require("../../core/lib")
const {promisify} = require("util")
const l = console.log;
const fs = require("fs")
const jwt = require("jsonwebtoken")
const {MongoClient} = require("mongodb");
const {allowRoles} = lib.middleware;
const {handleInternalServerErrors} = lib.functions;
const Schema = require('../../core/schema');
const {fields} = Schema;
const data = require("../../keys/data.json");
const keys = require("../../keys/keys.json");
const {MONGO_URL,STD_DB,STD_COLLECTION} = data;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN


// Schemas
let schema = {
  list:{
    required:['amount']
  }
}
// Middleware functions
let ListSchema = Schema.verify(schema.list)
// Routes
router.get("/",(req,res) => {
  res.send("Welcome to users API route")
})
// router.get("/getAdminAuthToken",(req,res) => {
//   jwt.sign({role:"admin"},JSON_WEBTOKEN_KEY,(err,docs) => {
//     if(err) res.sendStatus(500);
//     else res.json({token:docs})
//   })
// })
router.get("/u/:username/image",(req,res) => {
  let {username} = req.params;
  let searchString = lib.resPath(`../../images/users/${username}.jpg`)
  if(fs.existsSync(searchString)){
    if (isCorrupted(searchString)) {
      res.sendFile(lib.resPath('../../images/default.jpg'))
    } else {
      res.sendFile(lib.resPath(searchString))
    }
  }
  else res.sendFile(lib.resPath("../../images/default.jpg"))
  // res.send(searchString)
})
router.post("/list",fields("amount"),(req,res,next) => {
  let {amount} = req.body;
  amount = Number(amount)
  if (amount > 5) {
    if(!req.headers.authorization){
      res.status(406).send("To request for a higher amount than 5, authorization required(header absent)");
    } else {
      jwt.verify(req.headers.authorization,JSON_WEBTOKEN_KEY,(err,docs) => {
        if(err) res.status(403).send("Invalid token");
        else if(docs.role != 'admin') res.status(403).send("Insufficient role");
        else next()
      })
    }
  } else {
    next()
  }
},(req,res) => {
  let {amount} = req.body;
  amount = Number(amount)
  let start = req.body.start || 1;
  if(amount <= 0||start <= 0) res.status(406).send(`Amount ${req.body.start ? 'and/or start have': 'has'} to be at least 1`);
  else if(isNaN(amount)||isNaN(start)) res.status(406).send(`Amount ${req.body.start ? 'and/or start have':'has'} to be of type number`)
  else {
    (async function(){
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(STD_DB).collection(STD_COLLECTION);
      let result = await collection.find({},{
        projection:{_id:0,password:0}
      }).skip(start-1).limit(amount).toDocs();
      res.json(result);
    }()).catch(handleInternalServerErrors(res))
  }
})
router.post("/",(req,res) => {
  res.send("Welcome to API post route")
})
router.get("/*",(req,res) => {
  res.send(`Invalid GET route "${req.path}"`)
})
router.post("/*",(req,res) => {
  res.send(`Invalid POST route "${req.path}"`)
})

module.exports = router
