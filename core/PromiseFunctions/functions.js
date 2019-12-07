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
    writeNotif:async function(MongoClient,MONGO_URL,db,userCollection,userID,msg){
      let connection = await MongoClient.connect(MONGO_URL);
      let collection = connection.db(db).collection(userCollection);
      let pushObject = {
        notifications:{
          id:lib.uniqueIdGen(),
          timeStamp:Date.now(),
          message:msg,
          status:"unread"
        }
      }
      let result = await collection.updateOne({_id:new ObjectID(userID)},{$push:pushObject})
      return result
      connection.close()
    }
  }
}

// Lib.mongo.getAllPostsByUserId(MongoClient,"mongodb://localhost","main","classes").then((doc) => {
//   console.log(doc)
// })
if(process.argv.indexOf("--run-write-notif") != -1) {
  Lib.mongo.writeNotif(MongoClient,"mongodb://localhost","main","users","5de5232019a3c498011bdaa3","This is a test notification please work").then((res) => {
    console.log(res.result);
    process.exit(0)
  }).catch((err) => {
    console.error(err);
    process.exit(1)
  })
}

module.exports = Lib
