const express = require('express')
const router = express.Router();
const lib = require("../core/lib")
const {promisify} = require("util")
const l = console.log;
const {MongoClient,ObjectID} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../keys/data.json");
const keys = require("../keys/keys.json");
const fs = require("fs")
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS,MONGO_MAIN_DB} = data;
const {handleInternalServerErrors} = lib.functions;
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../core/schema");
const {fields} = Schema;
router.get("/",(req,res) => {
  res.send("Welcome to auth route")
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
  if(req.query.raw == "true") res.sendStatus(200)
  else res.redirect("/")
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
    }()).catch(handleInternalServerErrors(res))
  }
})
router.post("/change/password",fields("oldPassword","newPassword"),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let {uid} = req.session;
      let {oldPassword,newPassword} = req.body;
      l(oldPassword)
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user);
      let result = await collection.find({_id:new ObjectID(uid),password:oldPassword}).toDocs();
      l(result)
      if (result.isEmpty()) {
        res.status(403).send("Invalid old password")
      } else {
        result = await collection.updateOne({_id:new ObjectID(uid)},{$set:{password:newPassword}});
        res.send("Password changed successfully")
      }

      connection.close();
  }());
})
router.post("/login",fields("username","password"),(req,res) => {
  let {username,password} = req.body;
  if (req.session.user != undefined) {
    if(req.query.raw != 'true') res.redirect("/home")
    else res.send("Already logged in")
  }else if (username.trim() == "" || password.trim() == "") {
    res.status(406).send("Invalid username or password");
  } else {
    (async ()=>{
      username = username.toLowerCase()
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(STD_DB).collection(STD_COLLECTION);
      let result = await collection.find({username,password}).toDocs();
      if(result.isEmpty()){
        res.status(404).send("Invalid username or password")
      } else {
        req.session.user = username;
        req.session.type = result[0]['type'];
        req.session.uid = result[0]._id
        // console.log(result[0]._id);
        res.send('OK')
      }
       connection.close()
    })().catch(handleInternalServerErrors(res))
  }
})
router.post('/signup',fields({'username':"5+"},{"password":"10+"},"email","type"), (req,res) => {
  let {username,password,email,type} = req.body;
  if (!lib.cleanString(username)) {
    res.status(406).send("Not allowed to use special characters in the username")
  } else if (ACCOUNT_TYPES.indexOf(type) == -1) {
    res.status(406).send("Account type must either be student or teacher");
  } else if (!emailValidationExpression.test(email)) {
    res.status(406).send("Invalid email")
  }else {
    (async ()=>{
      username = username.toLowerCase();
      email = email.toLowerCase();
      let connection = await MongoClient.connect(MONGO_URL)
      let collection = connection.db(STD_DB).collection(STD_COLLECTION);
      let result = await collection.find({username}).toDocs()
      // res.send(result.isEmpty());
      if(!result.isEmpty()) {
        res.status(401).send("User already exists")
      } else {
        let result = await collection.insert({username,password,email,type});
        let id = result.ops[0]._id
        req.session.user = username;
        req.session.type = type;
        req.session.uid = id;
        res.send("Registered")
      }
      connection.close()
    })().catch(handleInternalServerErrors(res))
    // res.send("yeet")
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
