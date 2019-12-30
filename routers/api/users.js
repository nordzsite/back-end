const express = require('express')
const isCorrupted = require("is-corrupted-jpeg")
const router = express.Router();
const path = require("path");
const lib = require("../../core/lib")
const {promisify} = require("util")
const l = console.log;
const fs = require("fs")
const jwt = require("jsonwebtoken")
const {MongoClient,ObjectID} = require("mongodb");
const {allowRoles} = lib.middleware;
const {handleInternalServerErrors} = lib.functions;
const Schema = require('../../core/schema');
const {fields} = Schema;
const data = require("../../keys/data.json");
const keys = require("../../keys/keys.json");
const {MONGO_URL,STD_DB,STD_COLLECTION,MONGO_MAIN_DB,COLLECTIONS} = data;
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
router.get("/getAdminAuthToken",(req,res) => {
  jwt.sign({role:"admin"},JSON_WEBTOKEN_KEY,(err,docs) => {
    if(err) res.sendStatus(500);
    else res.json({token:docs})
  })
})
router.get("/:id/image",(req,res) => {
  let {id} = req.params;
  let searchString = path.resolve(__dirname,`../../resources/images/users/${id}.jpg`)
  if(fs.existsSync(searchString)){
    if (isCorrupted(searchString)) {
      l(__dirname)
      res.sendFile(path.resolve(__dirname,'../../public/front-end/public/images/default.jpg'))
    } else {
      res.sendFile(path.resolve(__dirname,`../../resources/images/users/${id}.jpg`))
    }
  }
  else res.sendFile(path.resolve(__dirname,"../../public/front-end/public/images/default.jpg"))
  // res.send(searchString)
})
router.get("/:uid/getAllPosts",(req,res) => {
  (async function() {
      let {uid} = req.params
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user);
      let requiredUser = await userCollection.findOne({_id:new ObjectID(uid)});
      let queryObject = {};
      queryObject[`members.${requiredUser.type}s`] = {$in:[uid]}
      let cursor = await classCollection.find(queryObject);
      let finalResultArray = [];
      while(await cursor.hasNext()){
        let current = await cursor.next();
        for(let post of current.posts){
          if (post.poster == uid)
          {
            post.classID = current._id;
            let ownerOfPost = await userCollection.findOne({_id:new ObjectID(post.poster)})
            ownerOfPost = ownerOfPost.username
            post.posterName = ownerOfPost
            post.className = current.name;
            for(let comment of post.comments){
              let userOfComment = await userCollection.findOne({_id:new ObjectID(comment.commenter)})
              userOfComment = userOfComment.username;
              comment.commenterName = userOfComment
            }
            finalResultArray.push(post)
          }
        }
      }
      res.json(finalResultArray)
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.get("/:uid/stats",(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL)
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user);
      let {uid} = req.params;
      let userResult = await userCollection.findOne({_id:new ObjectID(uid)},{projection:{type:1,_id:0}});
      let userType = userResult.type;
      let queryObject = {};
      queryObject[`members.${userType}s`] = {$in:[uid]}
      let cursor = await classCollection.find(queryObject,{projection:{posts:1,_id:0}});
      let resultObject = {posts:0,comments:0}
      while(await cursor.hasNext()){
        let currentRecord = await cursor.next();
        for(let post of currentRecord.posts){
          if(post.poster == uid) resultObject.posts++;
          for(let comment of post.comments){
            if(comment.commenter == uid) resultObject.comments++
          }
        }
      }
      res.json(resultObject)
      connection.close();
  }()).catch(handleInternalServerErrors(res));
})
// router.post("/list",fields("amount"),(req,res,next) => {
//   let {amount} = req.body;
//   amount = Number(amount)
//   if (amount > 5) {
//     if(!req.headers.authorization){
//       res.status(406).send("To request for a higher amount than 5, authorization required(header absent)");
//     } else {
//       jwt.verify(req.headers.authorization,JSON_WEBTOKEN_KEY,(err,docs) => {
//         if(err) res.status(403).send("Invalid token");
//         else if(docs.role != 'admin') res.status(403).send("Insufficient role");
//         else next()
//       })
//     }
//   } else {
//     next()
//   }
// },(req,res) => {
//   let {amount} = req.body;
//   amount = Number(amount)
//   let start = req.body.start || 1;
//   if(amount <= 0||start <= 0) res.status(406).send(`Amount ${req.body.start ? 'and/or start have': 'has'} to be at least 1`);
//   else if(isNaN(amount)||isNaN(start)) res.status(406).send(`Amount ${req.body.start ? 'and/or start have':'has'} to be of type number`)
//   else {
//     (async function(){
//       let connection = await MongoClient.connect(MONGO_URL);
//       let collection = connection.db(STD_DB).collection(STD_COLLECTION);
//       let result = await collection.find({},{
//         projection:{_id:0,password:0}
//       }).skip(start-1).limit(amount).toDocs();
//       res.json(result);
//     }()).catch(handleInternalServerErrors(res))
//   }
// })
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
