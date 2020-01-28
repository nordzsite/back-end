const l = console.log;
const express = require('express')
const router = express.Router();
const lib = require("../../core/lib")
const {promisify} = require("util")
const path = require("path")
const {MongoClient,ObjectID} = require("mongodb");
const PromiseFunctions = require("../../core/PromiseFunctions/functions")
const {writeNotif, getAllPostsByUserId} = PromiseFunctions.mongo;
const jwt = require("jsonwebtoken")
const data = require("../../keys/data.json");
const keys = require("../../keys/keys.json");
const fs = require("fs")
const {MONGO_URL,STD_DB,STD_COLLECTION,ACCOUNT_TYPES,COLLECTIONS,MONGO_MAIN_DB} = data;
const {allowRoles,sanitizeFields} = lib.middleware
const {handleInternalServerErrors} = lib.functions
const {emailValidationExpression} = lib.CONSTANTS;
const JSON_WEBTOKEN_KEY = keys.JSON_WEBTOKEN
const Schema = require("../../core/schema");
const {fields} = Schema;
router.get("/",(req,res) => {
  res.send("Welcome to main API route")
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
