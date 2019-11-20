const l = console.log;
const express = require('express')
const router = express.Router();
const lib = require("../../core/lib")
const {promisify} = require("util")
const {MongoClient,ObjectID} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../../keys/data.json");
const keys = require("../../keys/keys.json");
const fs = require("fs")
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS,MONGO_MAIN_DB} = data;
const {allowRoles,loginRequired} = lib.middleware
const {handleInternalServerErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../../core/schema");
const {fields} = Schema;
router.get("/",(req,res) => {
  res.send("Welcome to post API route")
})

router.post("/",(req,res) => {
  res.send("Welcome to post API post route")
})
router.all("/*",loginRequired,allowRoles(['teacher','student']))
router.post('/create',fields({title:"4+"},{"content":"4+"},"classID"),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let {uid,type} = req.session;
      let {title,content,classID} = req.body;
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let postObject = {
        id: lib.uniqueIdGen(),
        dateCreated: Date.now(),
        lastModified: Date.now(),
        poster: uid,
        title: title,
        content: content,
        comments:[]
      }
      let queryObject = {_id:new ObjectID(classID)};
      queryObject[`members.${type}s`] = {$in:[uid]}
      let result = await collection.updateOne(queryObject,{$push:{posts:postObject}});
      if (result.result.n == 0) res.status(404).send("Unable to write post, either class does not exist or you're not in the class")
      else {
        if (req.query.json == 'true') res.json({post:postObject})
        else res.send("Successfully posted to class")
      }
      connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post('/delete',fields('postID'),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let {postID} = req.body;
      let {uid}= req.session;
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let result = await collection.findOneAndUpdate(
        {posts:{$elemMatch:{id:postID,poster:uid}}},{$pull:{posts:{id:postID,poster:uid}}},
        {returnOriginal:true,
          projection:{
          _id:0,
          posts:{
            $elemMatch:{
              id:postID
            }
          }
        }});
      // l(result)
      if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) {
        if(req.query.json == 'true') res.status(404).json({code:404,message:"Post was not able to be deleted, or does not exist"})
        else res.status(404).send("Post was not able to be deleted, or does not exist")
      } else {
        if(req.query.json=='true') res.json({deletedPost:result.value.posts[0],timeStamp:Date.now()})
        else res.send("Successfully posted")
      }
      connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post('/edit',fields('postID','title','content'),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let {postID,title,content} = req.body;
      let {uid} = req.session;
      let result = await collection.findOneAndUpdate({
        posts:{
          $elemMatch:{
            id:postID,
            poster:uid
          }
        }
      },{
        $set:{
          "posts.$.title":title,
          "posts.$.content":content,
          "posts.$.lastModified":Date.now()
        }
      },{
        returnOriginal:false,
        returnNewDocument:true,
        projection:{
          _id:0,
          posts:{
            $elemMatch:{
              id:postID,
            }
          }
        }
      })

      if (result.lastErrorObject.n==0 || result.lastErrorObject.updatedExisting == false) {
        if(req.query.json == 'true') res.json({code:404,message:"Unable to updated doc, unable to find or invalid creds"})
        else res.send("Unable to updated doc, unable to find or invalid creds")
      } else {
        if(req.query.json == 'true') res.json({updatedPost:result.value.posts[0],timeStamp:Date.now()})
        else res.send("Successfully updated post")
      }
      connection.close();
  }()).catch (handleInternalServerErrors(res));
})
router.post("/list",fields('classID'),(req,res) => {
  (async function() {
      let {classID} = req.body;
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let result = await collection.findOne({_id:new ObjectID(classID)},{
        projection:
        {
          posts:1
        }
      })
      // res.json(result)
      let posts = result.posts.sort((a,b) => {
        return b.dateCreated-a.dateCreated
      })
      res.json(posts)
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.get("/*",(req,res) => {
  res.send(`Invalid GET route "${req.path}"`);
})
router.post("/*",(req,res) => {
  res.send(`Invalid POST route "${req.path}"`);
})

module.exports = router
