const l = console.log;
const express = require('express')
const router = express.Router();
const lib = require("../../core/lib")
const {promisify} = require("util")
const {MongoClient,ObjectID} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../../keys/data.json");
const PromiseFunctions = require("../../core/PromiseFunctions/functions")
const {writeNotif, getAllPostsByUserId} = PromiseFunctions.mongo;
const keys = require("../../keys/keys.json");
const fs = require("fs")
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS,MONGO_MAIN_DB} = data;
const {allowRoles} = lib.middleware
const {handleInternalServerErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../../core/schema");
const {fields} = Schema;
const multer = require("multer");
router.get("/",(req,res) => {
  res.send("Welcome to main API route")
})

router.post("/create",allowRoles("teacher"),fields("classID","content","dueDate"),(req,res) => {
  if(Date.now() > Number(req.body.dueDate)) res.status(406).send("Invalid due date")
  else {
    (async function() {
        let connection = await MongoClient.connect(MONGO_URL);
        let {classID,content,dueDate} = req.body;
        let {uid,type} = req.session;
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
        let queryObject = {_id:new ObjectID(classID)};
        queryObject[`members.${type}s`] = {$in:[uid]};
        let pushObject = {
          id:lib.uniqueIdGen(),
          dueDate,
          content,
          attachments:[],
          submissions:[]
        }
        let result = await collection.updateOne(queryObject,{$push:{assignments:pushObject}})
        // l(result)
        if(result.result.n == 0) res.send("Failed to create assignment")
        else {
          res.send("Successfully created assignment")
        }
        connection.close();
    }()).catch(handleInternalServerErrors(res,true));
  }
})
router.post("/delete",allowRoles("teacher"),fields("id"),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let {uid,type} = req.session;
      let {id} = req.body;
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let queryObject = {assignments:
        {
          $elemMatch:{
            id
          }
      }
    };
    queryObject[`members.${type}s`] = {$in:[uid]};
    let result = await collection.updateOne(queryObject,{$pull:{"assignments":{id}}});
    l(result);
    res.send("Successfully deleted assignment");
    connection.close()
  }()).catch(handleInternalServerErrors(res,true));
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
