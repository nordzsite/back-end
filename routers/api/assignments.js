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
const {allowRoles,loginRequired,sanitizeFields} = lib.middleware
const {handleInternalServerErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const {writeToClassGroup,writeNotif} = PromiseFunctions.mongo;
const {composeTemplate} = PromiseFunctions.email;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../../core/schema");
const {fields} = Schema;
const multer = require("multer");
router.get("/",(req,res) => {
  res.send("Welcome to main API route")
})
router.use(sanitizeFields("content","title"))
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
        // console.log(req.body)
        // console.log(`\n\n\n\n\n${classID}\n\n\n\n\n`)
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let queryObject = {_id:new ObjectID(classID)};
        queryObject[`members.${type}s`] = {$in:[uid]}
        if (await collection.countDocuments(queryObject) == 0) {
          // console.log(file)
          l(classID)
          cb(null,false)
        } else {
          l("is this calling true or not")
          // console.log("File failed F")
          cb(null,true)
        }
        connection.close()
    }());
  }
})
var assignmentCreateMulterUpload = multer({
  storage:multerStorage,
  fileFilter:function(req,file,cb){
    // l(file);
    (async function() {
        let {uid,type} = req.session;
        let {assignmentID} = req.body;
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let queryObject = {"assignments":{$elemMatch:{id:assignmentID,locked:false}}};
        queryObject[`members.${type}s`] = {$in:[uid]}
        if (await collection.countDocuments(queryObject) == 0) {
          // console.log("Invalid submission")
          cb(null,false)
        } else {
          // l("is this calling true or not")
          // console.log("File worked")
          // console.log(file)
          cb(null,true)
        }
        // console.log(file)
        connection.close()
    }());
  }
})
var assignmentMulterUpload = multer({
  storage:multerStorage,
  fileFilter:function(req,file,cb){
    // l(file);
    (async function() {
        let {uid,type} = req.session;
        let {submissionID} = req.body;
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let queryObject = {"assignments.submissions.id":submissionID};
        queryObject[`members.${type}s`] = {$in:[uid]}
        if (await collection.countDocuments(queryObject) == 0) {
          // console.log(file)
          cb(null,false)
        } else {
          // l("is this calling true or not")
          // console.log("File worked")
          // console.log(file)
          cb(null,true)
        }
        // console.log(file)
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
router.use(loginRequired)
router.post("/get",fields('assignmentID'),(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
    let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user);
    let {uid,type} = req.session;
    let {assignmentID} = req.body;
    l(assignmentID)
    let queryObject = {"assignments.id":assignmentID};
    queryObject[`members.${type}s`] = {$in:[uid]}
    let result = await collection.findOne(queryObject,{
    })
    let finalResult = {};
    if (result == null) res.status(404).send("Could not find assignment")
    else {
      for(let assignment of result.assignments) {
        if(assignment.id == assignmentID) {
          finalResult = assignment
          finalResult.submission = {}
          if(type == 'student') {
            assignment.isDue = true
            // console.log(assignment.submissions)
             for(let submission of assignment.submissions) {
              if(submission.owner == uid) {
                finalResult.submission = submission
                finalResult.isDue = false
              }
            }
            delete finalResult.submissions;
            finalResult.submission.feedback = finalResult.submission.feedback || []
              for(let feedback of finalResult.submission.feedback){
                let ownerOfFeedBack = await userCollection.findOne({_id:new ObjectID(feedback.owner)},{username:1})
                feedback.ownerName = ownerOfFeedBack.username
              }
          } else {
            finalResult = assignment
            finalResult.className = result.name
            for(let submission of finalResult.submissions) {
              // console.log(submission.owner)
              let ownerOfSubmission = await userCollection.findOne({_id:new ObjectID(submission.owner)},{username:1});
              for(let feedback of submission.feedback){
                let ownerOfFeedBack = await userCollection.findOne({_id:new ObjectID(feedback.owner)},{username:1})
                feedback.ownerName = ownerOfFeedBack.username
              }
              // console.log(ownerOfSubmission)
              ownerOfSubmission = ownerOfSubmission.username;
              submission.ownerName = ownerOfSubmission
            }
          }
        }
      }
      finalResult.classID = result._id
      res.json(finalResult)
    }
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post("/lock",allowRoles(['teacher']),fields('assignmentID'),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
      let {user,type,uid} = req.session;
      let {assignmentID} = req.body;
      // let {<query params>} = req.query;

      let queryObject = {}
      queryObject[`members.${type}s`] = {$in:[uid]}
      // Add any more conditions...
      let updateObject = {$set:{
        "assignments.$[a].locked":true
      }}
      let result = await classCollection.updateOne(queryObject,updateObject,
      {
        arrayFilters:[
          {"a.id": assignmentID}
        ]
      })
      if(result.result.n == 0) res.status(404).send("Unable to lock assignment")
      else {
      res.send('Sucessfully locked assignment')
    }
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/unlock",allowRoles(['teacher']),fields('assignmentID'),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
      let {user,type,uid} = req.session;
      let {assignmentID} = req.body;
      // let {<query params>} = req.query;

      let queryObject = {}
      queryObject[`members.${type}s`] = {$in:[uid]}
      // Add any more conditions...
      let updateObject = {$set:{
        "assignments.$[a].locked":false
      }}
      let result = await classCollection.updateOne(queryObject,updateObject,
      {
        arrayFilters:[
          {"a.id": assignmentID}
        ]
      })
      if(result.result.n == 0) res.status(404).send("Unable to unlock assignment")
      else {
      res.send('Sucessfully unlocked assignment')
    }
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/defaulters",allowRoles(['teacher']),fields("assignmentID"),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
      let {user,type,uid} = req.session;
      let {assignmentID} = req.body;
      let queryObject = {"assignments.id":assignmentID}
      queryObject[`members.${type}s`] = {$in:[uid]}
      let result = await classCollection.findOne(queryObject,{projection:{
        assignments:1,
        members:1
      }});
      let desiredAssignment = {};
      for(let assignment of result.assignments) if(assignment.id == assignmentID) desiredAssignment = assignment
      let finalArray = [];
      for(let submission of desiredAssignment.submissions) finalArray.push(submission.owner);
      // res.json(lib.findMissing(result.members,finalArray))
      res.json(result)
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/submission/create",allowRoles(['student']),(req,res) => {
  (async function() {
    assignmentCreateMulterUpload.single('additionalFile')(req,res,async function(err){
      if (err) {
        handleMulterErrors(res)
      } else if (typeof req.file != 'undefined'){
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user);
        let {uid,type} = req.session;
        let {assignmentID} = req.body;
        let content = req.body.content || "";
        content = lib.sanitizeString(content)
        // let queryObject = {"assignments":{$elemMatch:{
          //   id:assignmentID
          // }}};
        /*

         NOTE: IF USING POSITIONAL OPERATORS,
         ONLY ONE QUERY CONDITION CAN BE USED,
         ELSE USE ARRAY FILTERS

         */
        let queryObject = {"assignments":{$elemMatch:{
          id:assignmentID,
          locked:false
        }}};
        queryObject[`members.${type}s`] = {$in:[uid]};
        let file = req.file;
        let date = new Date().getTime()
        let result = await collection.findOneAndUpdate(queryObject,
        {
          $push:{"assignments.$[a].submissions":{
            dateCreated:date,
            lastModified:date,
            feedback:[],
            id:lib.uniqueIdGen(),
            content,
            fileName:file.filename,
            owner:uid,
            originalName:file.originalname
          }}
        },{
          arrayFilters:[
            {"a.id":assignmentID}
          ],
          returnNewDocument:true
        })
        if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) {
          res.send("Unable to delete submission");
          connection.close()
        }
        else {
          // console.log(result)
          res.json(result.value)
          requiredOwnerId = nameOfAssignment = "";
          for(let assignment of result.value.assignments) if(assignment.id == assignmentID) {
            requiredOwnerId = assignment.owner;
            nameOfAssignment = assignment.title;
            break;
          }
          let className = result.value.name;
          let notifContent = (content.trim() == "") ? `Uploaded "${req.file.originalname}"` : content;
          let emailOfOwner = await userCollection.findOne({_id:new ObjectID(requiredOwnerId)});
          emailOfOwner = emailOfOwner.email;
          composeTemplate(transporter,`${req.session.user} had made a new submission to assignment "${nameOfAssignment}"`,[emailOfOwner],path.resolve(__dirname,"../../public/front-end/public/private/email-inline.html"),{
            mainMessage:`${req.session.user} has made a new submission to assignment "${nameOfAssignment}"`,
            user:req.session.user,
            dateCreated:new Date().getSemiSimpleTime(),
            class:className,
            body:notifContent
          })
          writeNotif(connection,MONGO_MAIN_DB,COLLECTIONS.user,requiredOwnerId,`<b>${req.session.user}</b> has submitted to <b>${nameOfAssignment}</b>`,notifContent,"submission").then((e) => {
            console.log(e.result);
            connection.close()
          }).catch((err) => {
            console.error(err);
            connection.close()
          })
        }
      }
       else {
         res.send("Assignment is either locked or does not exist")
       }
    })
  }()).catch(handleInternalServerErrors(res));
})
router.post("/submission/delete",fields("submissionID"),allowRoles(['student']),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
      let {user,type,uid} = req.session;
      let {submissionID} = req.body;
      // let {<query params>} = req.query;
      let queryObject = {"assignments.submissions":{$elemMatch:{
        id:submissionID,
        owner:uid
      }}};
      let updateObject = {$pull:{
        "assignments.$.submissions":{
          id:submissionID,
          owner:uid
        }
      }}
      // do work to updateObject
      let result = await classCollection.findOneAndUpdate(queryObject,updateObject,{
      returnOriginal:true, // for getting original Document
      // returnNewDocument:true // for getting new document instead
      projection:{
        "assignments.$":1
      }
    })
      if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) res.status(404).send("msg")
      else {
      // res.send("OK");
      let value = result.value // Any traversion...
      res.json(value);
      for(let submission of value.assignments[0].submissions){
        if(submission.id == submissionID) {
          fs.unlink(path.resolve(__dirname,"../../resources/attachments/"+submission.fileName),(err) => {
            if(err) console.error(err)
          })
        }
      }
    }
      connection.close()
  }());

})
router.post("/submission/edit",(req,res) => {
  (async function() {
    if (req.query.uploadingFile == 'true') {
      assignmentMulterUpload.single('additionalFile')(req,res,async function(err){
      if (err) {
        handleMulterErrors(res)
      } else {
        let connection = await MongoClient.connect(MONGO_URL);
        let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
        let {uid,type} = req.session;
        // let {assignmentID} = req.body;
        let {submissionID} = req.body;
        let content = req.body.content || "";
        content = lib.sanitizeString(content);
        let queryObject = {"assignments.submissions.id":submissionID};
        queryObject[`members.${type}s`] = {$in:[uid]}
        let file = req.file;
        let date = new Date().getTime()
        // res.send(req.file)
        let result = await collection.findOneAndUpdate(queryObject,
        {
          $set:{
            "assignments.$[a].submissions.$[s].lastModified":date,
            "assignments.$[a].submissions.$[s].fileName":file.filename,
            "assignments.$[a].submissions.$[s].content":content,
            "assignments.$[a].submissions.$[s].originalName":file.originalname
        }},{
          projection:{
            assignments:{$elemMatch:
              {
                "submissions.id":submissionID
              }
            }
          },
          arrayFilters:[
            {"a.submissions.id":submissionID},
            {"s.owner":uid}
          ],
          returnNewDocument:false,
          returnOriginal:true
        })
        // console.log(result)
        if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) res.status(500).send("Unable to edit submission")
        else {
          res.send("Successfully updated submission")
          // console.log('FILE TRYING PLEASE')
          // let finalResult = {}
          let value = result.value;
          // console.log(value)
          for(let submission of value.assignments[0].submissions){
            if(submission.id==submissionID) {
              fs.unlink(path.resolve(__dirname,"../../resources/attachments/"+submission.fileName),(err) => {
                if(err) console.log(err)
              })
            }
          }
          // for(let assignment of value.assignments){
          //   if(assignment.id == assignmentID){
          //     for(let submission of assignment.submissions){
          //       if(submission.owner == uid) {
          //         fs.unlink(path.resolve(__dirname,`../../resources/attachments/${submission.fileName}`),(err) => {
          //           if(err) console.error(err)
          //         })
          //       }
          //     }
          //   }
          // }}
        }
        connection.close()
      }
    })
    } else {
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let {uid,type} = req.session;
      // let {assignmentID} = req.body;
      let {submissionID} = req.body;
      let content = req.body.content || "";
      content = lib.sanitizeString(content);
      let queryObject = {"assignments.submissions.id":submissionID};
      queryObject[`members.${type}s`] = {$in:[uid]}
      let date = new Date().getTime()
      // res.send(req.file)
      let result = await collection.findOneAndUpdate(queryObject,
      {
        $set:{
          "assignments.$[a].submissions.$[s].lastModified":date,
          "assignments.$[a].submissions.$[s].content":content,
      }},{
        projection:{
          assignments:{$elemMatch:
            {
              "submissions.id":submissionID
            }
          }
        },
        arrayFilters:[
          {"a.submissions.id":submissionID},
          {"s.owner":uid}
        ],
        returnNewDocument:false,
        returnOriginal:true
      })
      // console.log(result)
      if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) res.status(500).send("Unable to edit submission")
      else {
        res.send("Successfully updated submission")
        // console.log('FILE TRYING PLEASE')
        // let finalResult = {}
        let value = result.value;
        // console.log(value)
        // for(let assignment of value.assignments){
        //   if(assignment.id == assignmentID){
        //     for(let submission of assignment.submissions){
        //       if(submission.owner == uid) {
        //         fs.unlink(path.resolve(__dirname,`../../resources/attachments/${submission.fileName}`),(err) => {
        //           if(err) console.error(err)
        //         })
        //       }
        //     }
        //   }
        // }}
      }
      connection.close()
    }
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
    let result = await collection.findOne(queryObject,{projection:{assignments:1,name:1}});
    let className = result.name;
    let finalResultArray = [];
    for(let assignment of result.assignments) {
      let assignmentObject = assignment;
      // console.log(assignment.submissions.some)
      assignmentObject.status = (assignment.submissions.some(e => e.owner==uid)) ? 'submitted' : 'due';
      delete assignmentObject.submissions;
      assignmentObject.className = className
      finalResultArray.push(assignmentObject)
    }
    res.json(finalResultArray)
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.get("/list/all",(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
    let {uid,type} = req.session;
    let queryObject = {};
    queryObject[`members.${type}s`] = uid;
    let cursor = await collection.find(queryObject,{projection:{assignments:1,name:1}});
    let finalResultArray = []
    while(await cursor.hasNext()){
      let current = await cursor.next();
      // console.log(current)
      for(let assignment of current.assignments){
        let assignmentObject = assignment;
        assignmentObject.status = (assignment.submissions.some(e=>e.owner == uid)) ? 'submitted' : 'due';
        delete assignmentObject.submissions;
        assignmentObject.className = current.name;
        finalResultArray.push(assignmentObject)
      }
    }
    res.json(finalResultArray);
    connection.close();
  }()).catch(handleInternalServerErrors(res));
})
router.post("/feedback/create",allowRoles(['teacher']),fields("submissionID","content") ,(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
      let {user,type,uid} = req.session;
      let {submissionID,content} = req.body;
      let queryObject = {"assignments.submissions.id":submissionID};
      queryObject[`members.${type}s`] = {$in:[uid]};
      let feedbackId = lib.uniqueIdGen()
      let dateCreated = new Date().getTime()
      let updateObject = {
        $push:{
          "assignments.$[a].submissions.$[s].feedback":{
            id:feedbackId,
            owner:uid,
            content,
            dateCreated,
            lastModified:dateCreated,
          }
        }
      }
      let result = await classCollection.findOneAndUpdate(queryObject,updateObject,{
        arrayFilters:[
          {"a.submissions.id":submissionID},
          {'s.id':submissionID}
        ]
      })
      if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) res.status(404).send("msg")
      else {
      res.send('Successfully provided feedback');
      let requiredOwnerId = requiredAssignmentTitle = requiredAssignmentID = "";
      for(let assignment of result.value.assignments){
        let isFound = false;
        for(let submission of assignment.submissions) if(submission.id == submissionID) {
          requiredOwnerId = submission.owner;
          requiredAssignmentTitle = assignment.title;
          requiredAssignmentID = assignment.id;
          isFound = true; break;
        };
        if(isFound) break;
      }
      let notifContent = (content.length > 45)? content.substr(0,45)+"...":content;
      writeNotif(connection,MONGO_MAIN_DB,COLLECTIONS.user,requiredOwnerId,`<b>${req.session.user}</b> has provided feedback for assignment '${requiredAssignmentTitle}'`,notifContent,`/assignment/${requiredAssignmentID}`,"feedback").then((e) => {
        console.log(e.result);
        connection.close()
      }).catch((err) => {
        console.error(err);
        connection.close()
      })
    }
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/feedback/edit",allowRoles(['teacher']),fields("feedbackID","content") ,(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
      let {user,type,uid} = req.session;
      let {feedbackID,content} = req.body;
      let queryObject = {"assignments.submissions.feedback":{
          $elemMatch:{
            id:feedbackID,
            owner:uid
          }
        }
      }
      queryObject[`members.${type}s`] = {$in:[uid]}
      let updateObject = {
        $set:{
          "assignments.$[a].submissions.$[s].feedback.$[f].content":content,
          "assignments.$[a].submissions.$[s].feedback.$[f].lastModified":new Date().getTime()
        }
      }
      let result = await classCollection.updateOne(queryObject,updateObject,{
        arrayFilters:[
          {"a.submissions.feedback.id":feedbackID},
          {'s.feedback.id':feedbackID},
          {'f.id':feedbackID}
        ]
      })
      if(result.result.n == 0) res.status(404).send("Unable to edit feedback")
      else {
      res.send('Successfully edited feedback')
    }
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/feedback/clear",allowRoles(['teacher']),fields("feedbackID"),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
      let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
      let {user,type,uid} = req.session;
      let {feedbackID} = req.body;
      let queryObject = {"assignments.submissions.feedback":
      {$elemMatch:{
        id:feedbackID,
        owner:uid
      }}
    }
      queryObject[`members.${type}s`] = {$in:[uid]}
      let updateObject = {
        $pull:{
          "assignments.$[a].submissions.$[s].feedback":{
            id:feedbackID,
            owner:uid
          }
        }
      }
      let result = await classCollection.updateOne(queryObject,updateObject,{
        arrayFilters:[
          {"a.submissions.feedback.id":feedbackID},
          {'s.feedback.id':feedbackID}
        ]
      })
      if(result.result.n == 0) res.status(404).send("Unable to clear feedback")
      else {
      res.send('Successfully cleared feedback')
    }
      connection.close()
  }()).catch(handleInternalServerErrors(res));
})
router.post("/create",allowRoles(["teacher"]),(req,res) => {
  (async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
    if (req.query.uploadingFiles == 'true') {
      multerUpload.array("additionalFiles")(req,res,async function(err){
        if (err) {
          handleMulterErrors(res,err)
        } else {
          // console.log("In file upload section"+req.body.title)
          if(req.body.dueDate == undefined || req.body.title == undefined || req.body.content == undefined || req.body.classID == undefined ) res.status(406).send("Invalid schema 123")
          if(Date.now() > Number(req.body.dueDate)) res.status(406).send("Invalid due date")
          else {
          let {uid,type,user} = req.session;
          let {classID,content,title,dueDate} = req.body;
          content = lib.sanitizeString(content);
          let queryObject = {_id:new ObjectID(classID)};
          let className = (await collection.findOne({_id:new ObjectID(classID)},{projection:{name:1}})).name
          let attachments = [];
          for(let file of req.files) attachments.push({fileName:file.filename,originalName:file.originalname})
          queryObject[`members.${type}s`] = {$in:[uid]};
          assignmentID = lib.uniqueIdGen()
          let pushObject = {
            id:assignmentID,
            locked:false,
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
            composeTemplate(transporter,`Assignment has been posted to ${className}`,mailingList,path.resolve(__dirname,"../../public/front-end/public/private/email-inline.html"),{
              mainMessage:`${req.session.user} posted an assignment to class ${className} titled "${req.body.title}"`,
              user:req.session.user,
              dateCreated:new Date().getSemiSimpleTime(),
              class:className,
              body:req.body.content
            }).then((info) => {
              console.log(info)
            }).catch((err) => {
              console.error(err)
            })
            if(req.query.json == 'true') res.json(pushObject)
            else res.send("Successfully created assignment");
            if(req.query.noNotif != "true"){
              let user = await userCollection.findOne({_id:new ObjectID(uid)})
              user = user.username
              // console.log(user)
              writeToClassGroup(connection,MONGO_MAIN_DB,COLLECTIONS.user,COLLECTIONS.class,classID,`<b>${user}</b> posted an <b>assignment</b> to <b>${className}</b>`,`/assignment/${assignmentID}`,content,uid)
              .then((data) => {
                // console.log(data.result)
                connection.close()
              }).catch((err) =>  {
                throw err;
                console.error(err)
                connection.close()
              })
            } else {
              connection.close()
            }
          }
        }

      }})
    } else {
      // console.log("IT is going to non file upload option")
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
              console.log(assignmentID.red);
              content = lib.sanitizeString(content)
              let {uid, type} = req.session;
              let removedFiles = req.body.removedFiles;
              if (typeof removedFiles == 'undefined') removedFiles = []
              else removedFiles = (typeof removedFiles == 'string')? [JSON.parse(removedFiles)]:removedFiles.map(e=>JSON.parse(e))
              let additionalFiles = [];
              // let classResult = await collection.findOne({"assignments.id":assignmentID},{projection:{_id:1}});
              for(let file of req.files) additionalFiles.push({fileName:file.filename,originalName:file.originalname});
              let bulk = collection.initializeOrderedBulkOp()
              bulk.find({
                assignments:{
                  $elemMatch:{
                    id:assignmentID,
                  },
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
                  },
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
                  },
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
              // let classID = classResult._id;
              // let etcetera = (req.body.content.length > 50) ? "..." : "";
              // writeToClassGroup(connection,MONGO_MAIN_DB,COLLECTIONS.user,COLLECTIONS.class,classID,`<b>${req.session.user}</b> modified assignment "<b>${req.body.title}</b>"`,`/assignment/${assignmentID}`,req.body.content+etcetera,req.session.user).then((data) => {
              //   console.log(data);
              //   connection.close()
              // }).catch((err) => {
              //   console.error(err);
              //   connection.close()
              // })
              connection.close()
              res.send("successfully edited assignment");
            }
          }
        })
      } else {
        res.send("We're too lazy to make it without fileUpload sorry")
      }
  }()).catch(handleInternalServerErrors(res,true));
})
router.post("/delete",loginRequired,allowRoles(["teacher"]),fields("assignmentID"),(req,res) => {
  (async function() {
      let connection = await MongoClient.connect(MONGO_URL);
      let {uid,type} = req.session;
      let {assignmentID} = req.body;
      let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class);
      let queryObject = {assignments:
        {
          $elemMatch:{
            id:assignmentID
          }
      }
    };
    queryObject[`members.${type}s`] = {$in:[uid]};
    let result = await collection.findOneAndUpdate(queryObject,{$pull:{"assignments":{id:assignmentID}}},{returnOriginal:true,
      projection:{
      _id:0,
      assignments:{
        $elemMatch:{
          id:assignmentID
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
        });
      }
      for(let submission of result.value.assignments[0].submissions) {
        fs.unlink(path.resolve(__dirname,`../../resources/attachments/${submission.fileName}`),(err) => {
          if(err) console.error(err)
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


/*

FORMAT FOR CONNECTION:

(async function() {
    let connection = await MongoClient.connect(MONGO_URL);
    let classCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.class)
    let userCollection = connection.db(MONGO_MAIN_DB).collection(COLLECTIONS.user)
    let {user,type,uid} = req.session;
    // let {<body params>} = req.body;
    // let {<query params>} = req.query;

    let queryObject = {}
    queryObject[`members.${type}s`] = {$in:[uid]}
    // Add any more conditions...
    // for findOneAndUpdate:

    let updateObject = {}
  //   // do work to updateObject
  //   let result = await classCollection.findOneAndUpdate(queryObject,updateObject,{
  //   // returnOriginal:true, // for getting original Document
  //   // returnNewDocument:true // for getting new document instead
  //   projection:{}
  // })
  //   if(result.lastErrorObject.n == 0 || result.lastErrorObject.updatedExisting == false) res.status(404).send("msg")
  //   else {
  //   res.send("OK");
  //   // let value = result.value // Any traversion...
  // }
    // for cursor Traversion:
  //   let cursor = await classCollection.find(queryObject)
  //   while(await cursor.hasNext()){
  //     let current = cursor.next()
  //     // Do stuff...
  // }

    // classic findOne
  //   let result = await classCollection.findOne(queryObject);
  //   // do stuff with result..

  // classic updateOne
  //   let result = await classCollection.updateOne(queryObject,updateObject)
  //   if(result.result.n == 0) res.status(404).send("Unable to update document")
  //   else {
  //   res.send('okay')
  // }
    connection.close()
}()).catch(handleInternalServerErrors(res));

*/
