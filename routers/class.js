const express = require('express')
const router = express.Router();
const lib = require("../core/lib")
const {promisify} = require("util")
const l = console.log;
const {MongoClient} = require("mongodb");
const jwt = require("jsonwebtoken")
const data = require("../keys/data.json");
const keys = require("../keys/keys.json");
const fs = require("fs")
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS} = data;
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../core/schema");
const {fields} = Schema;

router.get("/*",(req,res,next) => {
  if(req.session.uid == undefined) res.sendStatus(403)
  else next()
})
router.post("/*",(req,res,next) => {
  if(req.session.uid == undefined) res.sendStatus(403)
  else next()
})
router.get("/",(req,res) => {
  res.send("Yo soy Bhagwan.")
})
router.post("/create",fields({"className":"4+"}),(req,res) => {
  if(req.session.type != 'teacher') res.status(403).send("Need to be teacher to create class")
  else {
    const className = req.body['className'];
    const uid = req.session.uid;
    (async function() {
        const connection = await MongoClient.connect(MONGO_URL);
        const collection = connection.db(STD_DB).collection(COLLECTIONS.class);
        const groupCode = lib.randGen(5);
        const record = {
          name:className,
          code:groupCode,
          members:{
            teachers:[uid]
          },
          assignments:[],
          posts:[]
        }
        const result = await collection.insertOne(record);
        if(result.n == 0) res.send("oof failed")
        else res.send("Class created")
        connection.close()
    }());
  }
})
router.get("/*",(req,res) => {
  res.status(404).send("Route not found")
})
router.post("/*",(req,res) => {
  res.status(404).send("Route not found")
})

module.exports = router;
