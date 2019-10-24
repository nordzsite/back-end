const express = require('express')
const router = express.Router();
const lib = require("../core/lib")
const {promisify} = require("util")
const l = console.log;
const {MongoClient} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../keys/data.json");
const keys = require("../keys/keys.json");
const fs = require("fs")
const {MONGO_URL,STD_DB,STD_COLLECTION} = data;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
router.get("/",(req,res) => {
  res.send("Welcome to session API route")
})
router.get('/get',(req,res) => {
  if(req.session.user == undefined){
    res.status(403).send("User not logged in")
  } else {
    res.send(req.session.user)
  }
})
router.post("/authorize",(req,res) => {
  jwt.sign(req.body,JSON_WEBTOKEN_KEY,(err,docs) => {
    if(err) {
      res.sendStatus(500);
      throw err
    } else res.send(docs)
  })
})
router.get("/logout",(req,res) => {
  req.session.destroy();
  res.redirect("/login");
})
router.post("/change/*",(req,res,next) => {
  if (req.session.user == undefined) {
    res.status(403).send("Forbidden")
  } else {
    next()
  }
})
router.post("/change/username",(req,res) => {
  // res.status(400).send("Ha");
  let {username,password} = req.body;
  let {user} = req.session;
  console.log(user)
  if(username.length < 5){
    res.status(406).send("Username must be at least 5 characters");
  } else {
    (async function(){
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(STD_DB).collection(STD_COLLECTION);
      let result = await collection.updateOne({username:user,password},{$set:{username}})
      if (result.result.nModified == 0) {
        res.status(403).send("Invalid password");
      } else {
        req.session.user = username;
        res.send("ok");
        if(fs.existsSync(lib.resPath("../images/users/"+user+".jpg"))){
          fs.rename(lib.resPath("../images/users/"+user+".jpg"),lib.resPath("../images/users/"+username+".jpg"),function(err){
            if(err) console.error(err);
          })
        }
      }
      connection.close();
    }())
  }
})

router.post("/login",(req,res) => {
  let {username,password} = req.body;
  if (req.session.user != undefined) {
    res.redirect("/session")
  }else if (username.trim() == "" || password.trim() == "") {
    res.status(406).send("Invalid username or password");
  } else {
    (async ()=>{
      username = username.toLowerCase()
      let connection = await MongoClient.connect("mongodb://localhost");
      let collection = connection.db(STD_DB).collection(STD_COLLECTION);
      let result = await collection.find({username,password}).toDocs();
      if(result.isEmpty()){
        res.status(404).send("Invalid username or password")
      } else {
        req.session.user = username;
        req.session.uid = result[0]._id
        // console.log(result[0]._id);
        res.send('OK')
      }
    })()
  }
})
router.post('/signup', (req,res) => {
  let {username,password} = req.body;
  if (!lib.cleanString(username)) {
    res.status(406).send("Not allowed to use special characters in the username")
  } else if (username.length < 5 || password.length < 10) {
    res.status(406).send("Username min length: 5 and password min length: 10")
  }else {
    (async ()=>{
      username = username.toLowerCase();
      let connection = await MongoClient.connect('mongodb://localhost')
      let collection = connection.db(STD_DB).collection(STD_COLLECTION);
      let result = await collection.find({username}).toDocs()
      // res.send(result.isEmpty());
      if(!result.isEmpty()) {
        res.status(401).send("User already exists")
      } else {
        collection.insert({username,password});
        req.session.user = username;
        res.send("Registered")
      }
      connection.close()
    })()
  }
})
router.post("/",(req,res) => {
  res.send("Welcome to API session post route")
})
router.get("/*",(req,res) => {
  res.send(`Invalid GET route "${req.path}"`)
})
router.post("/*",(req,res) => {
  res.send(`Invalid POST route "${req.path}"`)
})

module.exports = router
