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
const {allowRoles} = lib.middleware
const {handleInternalServerErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../core/schema");
const {fields} = Schema;

router.get("/*",(req,res,next) => {
  let role = req.session.type;
  if(req.session.uid == undefined) res.sendStatus(403)
  else if(!ACCOUNT_TYPES.includes(role)) res.status(400).send("Invalid role")
  else next()
})
router.post("/*",(req,res,next) => {
  let role = req.session.type;
  if(req.session.uid == undefined) res.sendStatus(403)
  else if(!ACCOUNT_TYPES.includes(role)) res.status(400).send("Invalid role")
  else next()
})
router.get("/",(req,res) => {
  res.send("Yo soy Bhagwan.")
})
router.post("/list/members",fields("classID"),(req,res) => {
  (async function() {
    let {classID} = req.body;
    let role = req.session.type;
    let queryObject = {_id:new ObjectID(classID)};
    queryObject[`members.${role}s`] = {$in:[req.session.uid]}
    let connection = await MongoClient.connect(MONGO_URL);
    let db = connection.db(MONGO_MAIN_DB);
    let classCollection = db.collection(COLLECTIONS.class);
    let userCollection = db.collection(COLLECTIONS.user);
    let result = await classCollection.findOne(queryObject,{projection:{members:1}});
    let finalSearchArray = [...result.members.teachers,...result.members.students]
    let finalResultArray = []
    for(let userID of finalSearchArray) {
      let user = await userCollection.findOne({_id:new ObjectID(userID)},{projection:{username:1,type:1}});
      finalResultArray.push(user)
    }
    res.json(finalResultArray);
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.get("/list/classes",(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let queryObject = {}
      queryObject[`members.${req.session.type}s`] = {$in:[req.session.uid]}
      let result = await collection.find(queryObject,{projection:{
        _id:1,
        name:1
      }}).toDocs();
      res.send(result);
      connection.close()
  }()).catch(handleInternalServerErrors(res))
})
router.post("/disband",allowRoles(['teacher']),fields("classID"),(req,res) => {
  // res.send("nice");
  (async function() {
    let {classID} = req.body;
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
    let result = await collection.removeOne({_id:new ObjectID(classID),"members.teachers":{$in:[req.session.uid]}});
    if(result.result.n == 0) res.status(404).send("Could not disband class, either you don't belong to class, doesn't exist or invalid id")
    else res.send("Class disbanded")
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post('/leave',(req,res) => {
  if (req.body.classCode == undefined && req.body.classID == undefined) res.status(406).send("Require at least class code or class ID")
  else if(req.body.classCode != undefined && req.body.classCode.length != 5) res.status(406).send("Invalid code sent")
  else {
    let searchQuery = (req.body.classID == undefined) ? {code:req.body.classCode} : {_id:new ObjectID(req.body.classID)};
    (async function() {
      let role = req.session.type;
      let pullObject = {};
      pullObject[`members.${role}s`] = req.session.uid;
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let result =  await collection.findOne(searchQuery);
      if (result == null) res.status(404).send("You are not in the class or search query invalid")
      else {
        let updatedResult = await collection.updateOne(searchQuery,{$pull:pullObject});
        if(updatedResult.result.ok != 1) res.status(501).send("Unable to leave class")
        else res.send("You have left class: "+result.name);
      }
      connection.close();
    }()).catch(handleInternalServerErrors(res));
  }
})
router.post('/join',fields('classCode'),(req,res) => {
  let role = req.session.type;
  let {classCode} = req.body;
  if(classCode.length != 5) res.status(401).send("Invalid code")
  else {
    (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let result = await collection.findOne({code:classCode})
      if (result != null) {
        if(result.members[`${role}s`].includes(req.session.uid)) res.status(409).send("Already in class")
        else {
          let address = `members.${role}s`
          let pushObject = {};
          pushObject[address] = req.session.uid
          let result = await collection.updateOne({code:classCode},{$push:pushObject})
          if(!result.result.ok) res.status(501).send("Error: unable to join class")
          else res.send("Joined class")
        }
      } else {
        res.status(404).send("Invalid code")
      }
      connection.close();
    }()).catch(handleInternalServerErrors(res))
  }
})
router.post("/create",fields({"className":"4+"}),(req,res) => {
  if(req.session.type != 'teacher') res.status(403).send("Need to be teacher to create class")
  else {
    const className = req.body['className'];
    const uid = req.session.uid;
    (async function() {
        const connection = await MongoClient.connect(MONGO_URL);
        const collection = connection.db(STD_DB).collection(COLLECTIONS.class);
        const groupCode = lib.randGen(5);
        while(await collection.countDocuments({code:groupCode}) != 0) groupCode = lib.randGen(5)
        const record = {
          name:className,
          code:groupCode,
          members:{
            teachers:[uid],
            students:[]
          },
          assignments:[],
          posts:[]
        }
        const result = await collection.insertOne(record);
        if(result.n == 0) res.status(500).json({message:"Failed to make class"})
        else res.json({
          message:"Class created",
          code:groupCode,
          name:className
        })
        connection.close()
    }()).catch(handleInternalServerErrors(res))
  }
})
router.post("/rename",fields({newClassName:"4+"},"classID"),allowRoles(['teacher']),(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let {classID,newClassName} = req.body
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
    let queryObject = {_id:new ObjectID(classID)};
    queryObject[`members.teachers`] = {$in:[req.session.uid]}
    let result = await collection.updateOne(queryObject,{$set:{name:newClassName}})
    if (result.result.n == 0) res.status(404).send("Unable to rename class, either not in class or invalid code")
    else res.send("Successfully renamed class")
    connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.get("/*",(req,res) => {
  res.status(404).send("Get oute not found")
})
router.post("/*",(req,res) => {
  res.status(404).send("Post route not found")
})

module.exports = router;
