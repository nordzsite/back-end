const l = console.log;
const express = require('express')
const router = express.Router();
const lib = require("../../core/lib")
const {promisify} = require("util")
const {MongoClient,ObjectID} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../../keys/data.json");
const path = require("path")
const PromiseFunctions = require("../../core/PromiseFunctions/functions")
const {getAllPostsByUserId} = PromiseFunctions.mongo;
const keys = require("../../keys/keys.json");
const fs = require("fs");
const nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
  service:'Gmail',
  auth:
  {
    user:'kabirdesarkar2016@gmail.com',
    pass:"Minecraft!23"
  }
})
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS,MONGO_MAIN_DB} = data;
const {allowRoles,loginRequired} = lib.middleware
const {handleInternalServerErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const {writeToClassGroup,writeNotif} = PromiseFunctions.mongo
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../../core/schema");
const {fields} = Schema;
const multer = require("multer");
router.get("/",(req,res) => {
  res.send("Welcome to main API route")
})
let multerStorage = multer.diskStorage({
  destination:function(req,file,callBack){
    // let loc = lib.resPath("resources/attachments")
    callBack(null,path.resolve(__dirname,"../../resources/attachments"))
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
          l("is this calling or not")
          // l(classID)
          cb(null,false)
        } else {
          l("is this calling true or not")
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
        let {assignmentID} = req.body;
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let queryObject = {"assignments.id":assignmentID};
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
router.post("/get",fields('assignmentID'),(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
    let {uid,type} = req.session;
    let {assignmentID} = req.body;
    l(assignmentID)
    let queryObject = {"assignments.id":assignmentID};
    queryObject[`members.${type}s`] = {$in:[uid]}
    let result = await collection.findOne(queryObject,{
    })
    let finalResult = {};
    if (result == null) res.status(500).send("Could not find assignment")
    else {
      for(let assignment of result.assignments) if(assignment.id == assignmentID) finalResult = assignment
      res.json(finalResult)
    }
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post("/list",fields("classID"),(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
    let {classID} = req.body;
    let {uid,type} = req.session;
    let queryObject = {_id:new ObjectID(classID)};
    queryObject[`members.${type}s`] = {$in:[uid]};
    let result = await collection.findOne(queryObject,{projection:{assignments:1}});
    let finalResultArray = [];
    for(let assignment of result.assignments) {
      let assignmentObject = assignment;
      // console.log(assignment.submissions.some)
      assignmentObject.status = (assignment.submissions.some(e => e.submitter==uid)) ? 'submitted' : 'due';
      delete assignmentObject.submissions;
      finalResultArray.push(assignmentObject)
    }
    res.json(finalResultArray)
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.get("/list/all",loginRequired,(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
    let {uid,type} = req.session;
    let queryObject = {};
    queryObject[`members.${type}s`] = uid;
    let cursor = await collection.find(queryObject,{projection:{assignments:1}});
    let finalResultArray = []
    while(await cursor.hasNext()){
      let current = await cursor.next();
      // console.log(current)
      for(let assignment of current.assignments){
        let assignmentObject = assignment;
        assignmentObject.status = (assignment.submissions.some(e=>e.submitter == uid)) ? 'submitted' : 'due';
        delete assignmentObject.submissions;
        finalResultArray.push(assignmentObject)
      }
    }
    res.json(finalResultArray);
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post("/create",loginRequired,allowRoles(["teacher"]),(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
    if (req.query.uploadingFiles == 'true') {
      multerUpload.array("additionalFiles")(req,res,async function(err){
        if (err) {
          handleMulterErrors(res,err)
        } else {
          console.log("In file upload section"+req.body.title)
          if(req.body.dueDate == undefined || req.body.title == undefined || req.body.content == undefined || req.body.classID == undefined ) res.status(406).send("Invalid schema")
          if(Date.now() > Number(req.body.dueDate)) res.status(406).send("Invalid due date")
          else {
          let {uid,type,user} = req.session;
          let {classID,content,title,dueDate} = req.body;
          let queryObject = {_id:new ObjectID(classID)};
          let className = (await collection.findOne({_id:new ObjectID(classID)},{projection:{name:1}})).name
          let attachments = [];
          for(let file of req.files) attachments.push({fileName:file.filename,originalName:file.originalname})
          queryObject[`members.${type}s`] = {$in:[uid]};
          assignmentID = lib.uniqueIdGen()
          let pushObject = {
            id:assignmentID,
            dueDate,
            content,
            title,
            submissions:[],
            attachments,
            owner:uid
          }
          let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
          let result = await collection.updateOne(queryObject,{$push:{assignments:pushObject}})
          if(result.result.n == 0) res.send("Unable to create assignment")
          else {
            let mailingList = [];
            for(let user of (await collection.findOne(queryObject)).members.students){
              let userObj = await userCollection.findOne({_id:new ObjectID(user)})
              mailingList.push(userObj.email)
            }
            // transporter.sendMail({
            //   from:'"Test acc 123" <kabirdesarkar2016@gmail.com>',
            //   to: mailingList,
            //   subject:"Test mail being sent",
            //   html:"<h1>Hello there</h1>, an assignment named: "+title+" was made",
            //   text:"There has been an assignment named " + title
            // },(err,info) => {
            //   if (err) {
            //     console.error(err)
            //   } else {
            //     console.log("Successfully sent mail")
            //   }
            // })
            res.send("Successfully created assignment, list of receipients to receive email = "+mailingList.join(', '));
            if(req.query.noNotif != "true"){
              writeToClassGroup(connection,MONGO_MAIN_DB,COLLECTIONS.user,COLLECTIONS.class,classID,`<b>${uid}</b> posted an <b>assignment</b> to <b>${className}</b>`,assignmentID,content,uid)
              .then((data) => {
                console.log(data)
              }).catch((err) => {
                throw err
              })
            }
          }
        }

      }})
    } else {
    if(req.body.dueDate == undefined || req.body.title == undefined ||req.body.content == undefined ||req.body.classID == undefined ) res.status(406).send("Invalid schema")
    if(Date.now() > Number(req.body.dueDate)) res.status(406).send("Invalid due date")
    else {
        let {classID,title,content,dueDate} = req.body;
        let {uid,type} = req.session;
        let queryObject = {_id:new ObjectID(classID)};
        queryObject[`members.${type}s`] = {$in:[uid]};
        let attachments = [];
        for(let file of req.files){
          attachments.push({
            fileName:file.filename,
            originalName:file.originalname
          })
          l(file)
        }
        let pushObject = {
          id:lib.uniqueIdGen(),
          dueDate,
          content,
          title,
          attachments:[],
          submissions:[],
          owner:uid
        }
        let result = await collection.updateOne(queryObject,{$push:{assignments:pushObject}})
        // l(result)
        if(result.result.n == 0) res.send("Failed to create assignment")
        else {
          res.send("Successfully created assignment")
        }
        connection.close();
    }
  }
}()).catch(handleInternalServerErrors(res,true));
})
router.post("/edit",loginRequired,allowRoles(['teacher']),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      if (req.query.fileUpload == "true") {
        editMulterUpload.array('additionalFiles')(req,res,async function(err){
          if (err) {
            handleMulterErrors(res)
          } else {
            if(req.body.dueDate == undefined || req.body.title == undefined || req.body.content == undefined || req.body.assignmentID == undefined) res.status(406).send("Invalid schema")
            else {
              let {dueDate,title,content,assignmentID} = req.body;
              let {uid, type} = req.session;
              let removedFiles = req.body.removedFiles;
              if (typeof removedFiles == 'undefined') removedFiles = []
              else removedFiles = (typeof removedFiles == 'string')? [JSON.parse(removedFiles)]:removedFiles.map(e=>JSON.parse(e))
              let additionalFiles = [];
              for(let file of req.files) additionalFiles.push({fileName:file.filename,originalName:file.originalname});
              let bulk = collection.initializeOrderedBulkOp()
              bulk.find({
                assignments:{
                  $elemMatch:{
                    id:assignmentID,
                    owner:uid
                  }
                }
              }).update({
                $set:{
                  "assignments.$.content":content,
                  "assignments.$.dueDate":dueDate,
                  "assignments.$.title":title,
                }
              })
              bulk.find({
                assignments:{
                  $elemMatch:{
                    id:assignmentID,
                    owner:uid
                  }
                }
              }).update({
                $pull:{
                  "assignments.$.attachments":{$in:removedFiles}
                }
              })
              bulk.find({
                assignments:{
                  $elemMatch:{
                    id:assignmentID,
                    owner:uid
                  }
                }
              }).update({
                $push:{
                  "assignments.$.attachments":{$each:additionalFiles}
                }
              })
              bulk.execute();
              for(let removedFile of removedFiles) {
                fs.unlink(path.resolve(__dirname,"../../resources/attachments/"+removedFile.fileName),(err) => {
                  if(err) console.error(err)
                })
              }
              res.send("successfully edited assignment");
              connection.close()
            }
          }
        })
      } else {

      }
  }()).catch(handleInternalServerErrors(res,true));
})
router.post("/delete",loginRequired,allowRoles(["teacher"]),fields("id"),(req,res) => {
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
    let result = await collection.findOneAndUpdate(queryObject,{$pull:{"assignments":{id}}},{returnOriginal:true,
      projection:{
      _id:0,
      assignments:{
        $elemMatch:{
          id:id
        }
      }
    }});
    // l(result);
    if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) res.send("Unable to delete assignment")
    else {
      res.send("Successfully deleted assignment");
      for(let file of result.value.assignments[0].attachments) {
        fs.unlink(path.resolve(__dirname,`../../resources/attachments/${file.fileName}`),(err) => {
          if(err) console.error(err);
        })
      }
    }
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
