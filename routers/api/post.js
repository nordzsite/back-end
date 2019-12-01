const l = console.log;
const express = require('express')
const router = express.Router();
const lib = require("../../core/lib")
const {promisify} = require("util")
const {MongoClient,ObjectID} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../../keys/data.json");
const keys = require("../../keys/keys.json");
const fs = require("fs");
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS,MONGO_MAIN_DB} = data;
const {allowRoles,loginRequired} = lib.middleware
const {handleInternalServerErrors,handleMulterErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN;
const multer = require("multer");
const Schema = require("../../core/schema");
const {fields} = Schema;
router.get("/",(req,res) => {
  res.send("Welcome to post API route")
})
// l(lib.resPath("resources/attachments"));
// l(process.cwd())
let multerStorage = multer.diskStorage({
  destination:function(req,file,callBack){
    // let loc = lib.resPath("resources/attachments")
    callBack(null,lib.resPath("resources/attachments"))
  },filename:function(req,file,callBack){
    // l(file);
    callBack(null, `${lib.uniqueIdGen(15)}.${file.originalname.split('.').lastElem()}`)
  }
})
var multerUpload = multer({
  storage:multerStorage,
  fileFilter:function(req,file,cb){
    // l(file);
    (async function() {
        let {uid,type} = req.session;
        let {classID} = req.body;
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let queryObject = {_id:new ObjectID(classID)};
        queryObject[`members.${type}s`] = {$in:[uid]}
        if (await collection.countDocuments(queryObject) == 0) {
          // l("is this calling or not")
          // l(classID)
          cb(null,false)
        } else {
          cb(null,true)
        }
        connection.close()
    }());
  }
})
let editMulterUpload = multer({
  storage:multerStorage,
  fileFilter:function(req,file,cb){
    (async function() {
        let {uid,type} = req.session;
        let {postID} = req.body;
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let queryObject = {"posts.id":postID};
        queryObject[`members.${type}s`] = {$in:[uid]}
        if (await collection.countDocuments(queryObject) == 0) {
          // l("is this calling or not")
          cb(null,false)
        } else {
          cb(null,true)
        }
        connection.close()
    }())
  }
})
router.post("/",(req,res) => {
  res.send("Welcome to post API post route")
})
router.all("/*",loginRequired,allowRoles(['teacher','student']))
router.post('/create',(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let {uid,type} = req.session;
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      if (req.query.uploadingFile != 'true') {
        if (req.body.classID == undefined) {
          res.status(406).send("Invalid schema")
        } else if (req.body.content == undefined || req.body.content.length < 2) {
          res.status(406).send("Invalid schema")
        } else {
          let {content,classID} = req.body;
          let postObject = {
            id: lib.uniqueIdGen(),
            dateCreated: Date.now(),
            lastModified: Date.now(),
            poster: uid,
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
        }
      } else {
        multerUpload.array('additionalFiles')(req,res,async function(err){
          if(err) handleMulterErrors(res,err)
          else {
            if(req.body.classID == undefined) res.status(406).send("classID required");
            else {
              let {classID,content} = req.body
              let queryObject = {_id:new ObjectID(classID)};
              queryObject[`members.${type}s`] = {$in:[uid]};
              let currentTime = Date.now()
              let postObject = {
                id:lib.uniqueIdGen(),
                content:content,
                dateCreated:currentTime,
                lastModified:currentTime,
                poster:uid,
                comments:[],
                attachments:[]
              }
              // l(req.files)
              for(let item of req.files){
                postObject.attachments.push({
                  fileName:item.filename,
                  originalName:item.originalname
                });
              }
              let result = await collection.updateOne(queryObject,{$push:{posts:postObject}});
              if (result.result.n == 0) res.status(404).send("Unable to write post, either class does not exist or you're not in the class")
              else {
                if (req.query.json == 'true') res.json({post:postObject})
                else res.send("Successfully posted to class")
              }
            }
            connection.close()
          }
        })
      }
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
        else res.send("Successfully deleted")
        for(let attachment of result.value.posts[0].attachments){
          fs.unlink("resources/attachments/"+attachment.fileName,(err) => {
            if(err) console.error(err)
          })
        }
      }
      connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post('/edit',(req,res) => {
  (async function() {
      let connection = await MongoClient.connect("mongodb://localhost");
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      // l(req.query.postFiles !='true')
      if (req.query.postFiles != 'true') {
        if (req.body.content == undefined || req.body.postID == undefined) {
          res.status(406).send("Invalid schema")
        } else {
          let {postID,content} = req.body;
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
        }
        connection.close();
      } else {
        editMulterUpload.array('additionalFiles')(req,res,async function(err){
          if(err) handleMulterErrors(err,res);
          else {
            let {uid,type} =req.session;
            // l(req.body)
            let {postID,content,removedFiles} = req.body;
            if (typeof removedFiles == 'undefined') {
              removedFiles = []
            } else {
              removedFiles = (typeof removedFiles == 'string')? [JSON.parse(removedFiles)]:removedFiles.map(e=>JSON.parse(e))
            }
            // console.log(removedFiles)
            let pushObject = {attachments:[]}
            for(let file of req.files){
              pushObject.attachments.push({
                fileName:file.filename,
                originalName:file.originalname
              })
            }
            // let result = await collection.findOneAndUpdate({
            //   posts:{
            //     $elemMatch:{
            //       id:postID,
            //       poster:uid
            //     }
            //   }
            // },{
            //   $set:{
            //     "posts.$.content":content,
            //     "posts.$.lastModified":Date.now(),
            //   },
            //   $pull:{
            //     "posts.$.attachments":{$in:removedFiles}
            //   },
            //   $push:{
            //     posts:pushObject
            //   }
            // })
            let bulk = collection.initializeOrderedBulkOp();
            bulk.find({posts:{
              $elemMatch:{
                id:postID,
                poster:uid
              }
            }}).update({$set:{
              "posts.$.content":content,
              "posts.$.lastModified":Date.now(),
            }})
            bulk.find({posts:{
              $elemMatch:{
                id:postID,
                poster:uid
              }
            }}).update({
              $pull:{
                "posts.$.attachments":{$in:removedFiles}
              }
            })
            bulk.find({posts:{
              $elemMatch:{
                id:postID,
                poster:uid
              }
            }}).update({
              $push:{
                "posts.$.attachments":{$each:pushObject.attachments}
              }
            })
            bulk.execute()
            for(let removedFile of removedFiles){
              fs.unlink("resources/attachments/"+removedFile.fileName,(err) => {
                if(err) console.error(err)
              })
            }
            res.send("Successfully edited post")
            connection.close();
          }
        })
      }

  }()).catch (handleInternalServerErrors(res));
})
router.post("/list",fields('classID'),(req,res) => {
  (async function() {
      let {classID} = req.body;
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user);
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
      for(let post of posts){
        let userOfPost = await userCollection.findOne({_id:new ObjectID(post.poster)});
        userOfPost = userOfPost.username;
        post.posterName = userOfPost;
        for(let comment of post.comments){
          let userOfComment = await userCollection.findOne({_id:new ObjectID(comment.commenter)});
          userOfComment = userOfComment.username;
          comment.commenterName = userOfComment;
        }
      }
      res.json(posts)
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/testmultipart",multerUpload.none(),(req,res) => {
  res.send(req.body)
})
router.get("/get/:id",(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let DB = connection.db(MONGO_MAIN_DB);
      let classCollection = DB.collection(COLLECTIONS.class);
      let userCollection = DB.collection(COLLECTIONS.user);
      let {uid,type} = req.session;
      let {id} = req.params;
      let queryObject= {"posts.id":id};
      queryObject[`members.${type}s`] = {$in:[uid]}
      let postResult = await classCollection.findOne(
        queryObject
      ,
    {projection:{
      "posts.$":1
    }});
    if (postResult == null) {
      res.status(404).send("Post not found")
    } else {
       postResult = postResult.posts[0]
      let userOfPost = await userCollection.findOne({_id:new ObjectID(postResult.poster)})
      postResult.posterName = userOfPost.username
      for (let comment of postResult.comments) {
        let userOfComment = await userCollection.findOne({_id:new ObjectID(comment.commenter)});
        userOfComment = userOfComment.username;
        comment.commenterName = userOfComment;
      }
      res.json(postResult)
    }
  }()).catch(handleInternalServerErrors(res,true));
})
router.get("/list/all",(req,res) => {
  (async function() {
      let {type,uid} = req.session;
      let connection = await MongoClient.connect(MONGO_URL);
      let db = connection.db(MONGO_MAIN_DB);
      let collection = db.collection(COLLECTIONS.class);
      let userCollection = db.collection(COLLECTIONS.user)
      let cursor = await collection.find();
      let resultArray = [];
      while (await cursor.hasNext()) {
        let current = await cursor.next();
        if(current.members[`${type}s`].includes(uid)) for(let post of current.posts) {
          let className = current.name;
          let userOfPost = await userCollection.findOne({_id:new ObjectID(post.poster)},{});
          post.posterName = userOfPost.username;
          post.posterType = userOfPost.type;
          post.classID = current._id;
          post.className = className;
          for(let comment of post.comments){
            let userOfComment = await userCollection.findOne({_id:new ObjectID(comment.commenter)});
            userOfComment = userOfComment.username;
            comment.commenterName = userOfComment
          }
          resultArray.push(post)
        }
      }
      res.json(resultArray.reverse());
      connection.close()
  }()).catch(handleInternalServerErrors(res))  ;
})
router.post("/comment/create",fields('postID',{content:"5+"}),(req,res) => {
  (async function() {
      let {postID,content} = req.body;
      let isJSON = (req.query.json == 'true');
      let {uid,type} = req.session;
      let currentTime = Date.now();
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let pushObject = {
        id:lib.uniqueIdGen(7),
        commenter:uid,
        content,
        dateCreated:currentTime,
        lastModified:currentTime
      }
      let queryObject = {"posts.id":postID};
      queryObject[`members.${type}s`] = {$in:[uid]}
      let result = await collection.updateOne(
        queryObject,
        {$push:{"posts.$.comments":pushObject}}
      );
      if(result.result.n == 0) {
        if(isJSON) res.json({code:404,message:"Unable to add comment, either don't belong to class or invalid id"})
        else res.send("Unable to add comment, either not part of class or invalid postID")
      } else {
        if(isJSON) res.json({timeStamp:currentTime,comment:pushObject})
        else res.send("Successfully added comment")
      }
      connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post("/comment/edit",fields("commentID","content"),(req,res) => {
  (async function() {
    let isJSON = (req.query.json == 'true');
    let {uid} = req.session;
    let {commentID,content} = req.body;
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
    let result = await collection.findOneAndUpdate({
      "posts.comments":{
        $elemMatch:{
          id:commentID,
          commenter:uid
        }
      }
    },
    {
      $set:{
        "posts.$[postElem].comments.$[commentElem].content":content,
        "posts.$[postElem].comments.$[commentElem].lastModified":Date.now()
      }
    },
    {
      returnOriginal:false,
      returnNewDocument:true,
      fields:{
        "posts.$":1
      },
      arrayFilters:[
        {"postElem.comments.id":commentID},
        {"commentElem.id":commentID}
      ]
    }
  )
  if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) {
    if(isJSON) res.json({code:404,message:"Unable to edit comment"})
    else res.send("Unable to edit comment")
  } else {
    // let {value} = result;
    // l(result)
    let comments = result.value.posts[0].comments;
    let comment = {}
    for(let item of comments){
      if(item.id == commentID) {
        comment = item;
        break;
      }
    }
    if(req.query.json == 'true') res.json({editedComment:comment,timeStamp:Date.now()})
    else res.send("Successfully posted comment")
  }
}()).catch(handleInternalServerErrors(res));
})
router.post("/comment/delete",fields("commentID"),(req,res) => {
  (async function() {
    let {type,uid} = req.session;
    let {commentID} = req.body;
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
    let result = await collection.findOneAndUpdate({
      "posts.comments":{
        $elemMatch:{
          id:commentID,
          commenter:uid
        }
      }
    },{
      $pull:{
        "posts.$.comments":{
          id:commentID,
          commenter:uid
        }
      }
    },{
      returnOriginal:true,
      projection:{
        "posts.$":1
      }
    });
    if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) res.status(404).send("Unable to delete")
    else {
      // res.json(result);
      let value = result.value;
      let comments = value.posts[0].comments;
      let comment = {};
      for (let item of comments) {
        if(item.id == commentID) {
          comment = item;
          break;
        }
      }
      if(req.query.json == 'true')res.json({deletedComment:comment,timeStamp:Date.now()})
      else res.send("Successfully deleted comment")
    }
  }()).catch(handleInternalServerErrors(res));
})
router.get("/*",(req,res) => {
  res.status(404).send(`Invalid GET route "${req.path}"`);
})
router.post("/*",(req,res) => {
  res.status(404).send(`Invalid POST route "${req.path}"`);
})

module.exports = router
