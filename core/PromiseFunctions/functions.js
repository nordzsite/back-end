const path = require("path");
const fs = require('fs');
const mongodb = require("mongodb");
const lib = require("../lib");
const {MongoClient,ObjectID} = mongodb;
const Lib = {
  mongo:{
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
    writeNotif:async function(MongoConnection,db,userCollection,userID,msg,type="post"){
      let collection = MongoConnection.db(db).collection(userCollection);
      let pushObject = {
        notifications:{
          id:lib.uniqueIdGen(),
          timeStamp:Date.now(),
          type,
          message:msg,
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
