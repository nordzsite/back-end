const path = require("path");
const fs = require('fs');
const mongodb = require("mongodb");
const lib = require("../lib");
const {MongoClient,ObjectID} = mongodb;
const Lib = {
  mongo:{
    mapUsers:async function mapUsers(connection,db,userCollection,uidList){
      let finalDict = {};
      let compressedList = Array.from(new Set(uidList));
      compressedList = compressedList.map(function(e){return {_id:new ObjectID(e)}});
      let collection = connection.db(db).collection(userCollection);
      let cursor = await collection.find({$or:compressedList});
      while(await cursor.hasNext()){
        let current = await cursor.next();
        let id = current._id.toString();
        delete current._id;
        finalDict[id] = current;
      }
      return finalDict
    },
    getAllPostsByUserId:async function getAllPostsByUserId(MongoClient,url,db,classCollection,uid,role){
      let connection = await MongoClient.connect(url);
      let collection = connection.db(db).collection(classCollection);
      let queryObject = {}
      queryObject[`members.${role}s`] = {$in:[uid]};

      let cursor = collection.find({},{projection:{posts:1}});
      let postArray = [];
      while(await cursor.hasNext()){
        // array.push(cursor.next())
        let current = cursor.next();

      }
      return array
      connection.close();
    },
    writeNotif:async function(MongoConnection,db,userCollection,userID,msg,content,hook,type="post"){
      let collection = MongoConnection.db(db).collection(userCollection);
      console.log("Notification: "+msg.brightGreen.bold+"\n\n\n\n\n")
      let pushObject = {
        notifications:{
          id:lib.uniqueIdGen(),
          timeStamp:Date.now(),
          type,
          hook,
          message:msg,
          content,
          status:"unread"
        }
      }
      let result = await collection.updateOne({_id:new ObjectID(userID)},{$push:pushObject})
      return result
    },
    writeToClassGroup:async function(MongoConnection,db,userCollection,classCollection,classID,msg,hook,content,initiator,type="assignment"){
      // console.log(lib)
      // return {}
      userCollection = MongoConnection.db(db).collection(userCollection);
      classCollection = MongoConnection.db(db).collection(classCollection);
      console.log({_id:new ObjectID(classID)},{projection:{members:1}})
      let classResult = await classCollection.findOne({_id:new ObjectID(classID)},{projection:{members:1}});
      let tempStudentArray = []
      for(let student of classResult.members.students) tempStudentArray.push({_id:new ObjectID(student)});
      let notificationResult = await userCollection.updateMany({$or:tempStudentArray},{$push:{notifications:{
        id:lib.uniqueIdGen(),
        timeStamp:Date.now(),
        message:msg,
        content,
        type,
        hook,
        initiator,
        status:"unread"
      }}})
      return notificationResult
    }
  },
  email:{
    composeTemplate:function(transporter,subject,recipients,templatePath,templateObject,ifTextOnlyMessage="",organisationName="NordZSite"){
      return new Promise((resolve,reject) => {
        fs.readFile(templatePath,(err,docs) => {
          if(err) {
            reject(err)
            console.error(err)
          }
          else {
            let docString = String(docs.toString())
            let finalString = lib.simpleApplyTemplate(docString,templateObject);
            templateObject.body = templateObject.body || "This is supposed to be the body of the plain text message, please subscribe to html mailing service for quality mails"
            transporter.sendMail({
              from:'"Test acc 123" <kabirdesarkar2016@gmail.com>',
              to: recipients,
              subject:`[${organisationName}] ${subject}`,
              html:finalString,
              text:templateObject.body
            },(err,info) => {
              if (err) {
                console.error(err);
                reject(err)
              } else {
                resolve(info)
                console.log("\n\n=======Successfully sent mail=======\n\n".brightBlue)
              }
            })
          }
        })
      })
    }
  }
}

// Lib.mongo.getAllPostsByUserId(MongoClient,"mongodb://localhost","main","classes").then((doc) => {
//   console.log(doc)
// })
if(process.argv.indexOf("--run-write-basic-notif") != -1) {
  Lib.mongo.writeNotif(MongoClient,"mongodb://localhost","main","users","5db48a20b7d143b4a8b6fcdb","This is a test notification please work").then((res) => {
    console.log(res.result);
    process.exit(0)
  }).catch((err) => {
    console.error(err);
    process.exit(1)
  })
} else if(process.argv.indexOf("--run-write-class-notif") != -1) {
  Lib.mongo.writeToClassGroup(MongoClient,"mongodb://localhost","main","classes","users","5dceb8b75e310ca90f21065e","This should work as a test notification please do")
  .then((notificationResult) => {
    console.log(notificationResult)
    process.exit(0)
  }).catch((err)=>{
    console.error(err);
    process.exit(1)
  })
} else if(process.argv.indexOf("--remove-all-notifs") != -1){
  (async function() {
      let connection = await MongoClient.connect("mongodb://localhost");
      let collection = connection.db("main").collection("users");
      let result = await collection.updateMany({},{$set:{notifications:[]}});
      console.log(result.result)
      connection.close();
  }()).catch((err) => {
     console.error(err);
  });
} else if(process.argv.indexOf("--map-users") != -1){
  (async function() {
      let connection = await MongoClient.connect("mongodb://localhost");
      let data = await Lib.mongo.mapUsers(connection,"main","users",['5de523e719a3c498011bdaa4','5de5232019a3c498011bdaa3']);
      connection.close();
      let finalArray = []
      for(let key in data) {
        let object = data[key];
        object['_id'] = key;
        finalArray.push(object);
      }
      console.log(finalArray)
  }());
}

// only for testing and practice inside iife
(function() {
  function promiseFunc(msg,time){
    return new Promise((resolve,reject) => {
      try {
        if(msg.length < 5) reject("Not enough characters in message")
        else {
          setTimeout(() => {
            resolve(msg)
          },time)
        }
      } catch (e) {
        reject(e)
      }
    })
  }
}());
module.exports = Lib
