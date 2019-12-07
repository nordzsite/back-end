const express = require('express')
const router = express.Router();
const colors = require("colors")
const lib = require("../../core/lib")
const l = lib.bindLogging(true);
const {promisify} = require("util")
const {MongoClient,ObjectID} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../../keys/data.json");
const keys = require("../../keys/keys.json");
const PromiseFunctions = require("../../core/PromiseFunctions/functions")
const {writeNotif, getAllPostsByUserId} = PromiseFunctions.mongo;
const fs = require("fs")
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS,MONGO_MAIN_DB} = data;
const {allowRoles,loginRequired} = lib.middleware
const {handleInternalServerErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../../core/schema");
const {fields} = Schema;
router.get("/",(req,res) => {
  res.send("Welcome to main API route")
})
router.get("/markRead/:id",loginRequired,(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user);
      let {uid} = req.session;
      let {id} = req.params;
      let result = await collection.updateOne({_id:new ObjectID(uid),notifications:{
        $elemMatch:{
          id:id
        }
      }},{$set:{"notifications.$.status":"read"}});
      if(result.result.n == 0) res.status(404).send("Unable to mark notification as read");
      else res.send("Successfully marked as read");
      let record = await collection.findOne({_id:new ObjectID(uid)},{
        projection:{notifications:1}
      })
      if(result.result.n != 0){
        let totalReads = lastReadIndex = 0;
        result = await collection.findOne({_id:new ObjectID(uid)})
        let pullRequired = false;
        for(let i=0;i<result.notifications.length;i++){
          let notification = result.notifications[i];
          if(notification.status == "read") {
            totalReads++;lastReadIndex = i;
            if(totalReads == 5) {
              pullRequired = true;
              break;
            }
          }
        }
        if(pullRequired){
          l("[Notifications] Pull is required".red.bold)
          let unsetObject = {};
          unsetObject[`notifications.${lastReadIndex}`] = 1;
          l("[Notifications] Attempting unset".bold)
          let unsetResult = await collection.updateOne({_id:new ObjectID(uid)},{$unset:unsetObject})
          l((unsetResult.result.n ==0)?"[Notifications] Unset failed".red.bold:"[Notifications] Unset success".blue.bold)
          l("[Notifications] Attempting pull".bold)
          let pullResult = await collection.updateOne({_id:new ObjectID(uid)},{$pull:{
            "notifications":null
          }})
          l((pullResult.result.n ==0)?"[Notifications] Pull failed".red.bold:"[Notifications] Pull success".blue.bold)
        } else l("[Notifications] Pull is not required".blue.bold)
      }
      // res.send("sdfsdf")
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/",(req,res) => {
  res.send("Welcome to notification  post route")
})
router.get("/*",(req,res) => {
  res.send(`Invalid GET route "${req.path}"`)
})
router.post("/*",(req,res) => {
  res.send(`Invalid POST route "${req.path}"`)
})

module.exports = router
