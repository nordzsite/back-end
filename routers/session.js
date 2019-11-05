const express = require('express')
const router = express.Router();
const lib = require("../core/lib")
const {promisify} = require("util")
const l = console.log;
const fs = require("fs");
const path = require("path")
const multer = require("multer")
const isCorrupted = require("is-corrupted-jpeg")
const multerStorage = multer.diskStorage({
  destination:function(req,file,cb){
    cb(null,lib.resPath("../images/users"));
  },
  filename:function(req,file,cb){
    cb(null,req.session.user+'.jpg');
  }
})
const multerUploader = multer({storage:multerStorage
  ,fileFilter:function(req,file,cb){
    // console.log(file.fieldname)
    // console.log(file.buffer)
     cb(null,true)
  }
}).single('file');
router.get("/",(req,res) => {
  res.send("Welcome to session API route")
})
router.get('/get',(req,res) => {
  if(req.session.user == undefined){
    res.status(403).send("User not logged in")
  } else {
    let jsonObj = {user:req.session.user,type:req.session.type}
    res.send(jsonObj);
  }
})
router.post('/upload',(req,res,next) => {
  multerUploader(req,res,function(err){
    if(err instanceof multer.MulterError){
      if(err.message == "Unexpected field"){
        res.status(401).send("Invalid field sent")
      }
    } else if (err) {

      res.status(400).send(err.message)
    }
    // console.log(req.file)
    else {
      console.log(req.file)
      res.send("OK")
    }
    // res.send("OK")
  })
})
router.get("/image",(req,res) => {
  let {user} = req.session;
  let searchString = `../images/users/${user}.jpg`;
  let finalSearchString = path.resolve(__dirname,searchString);
  let truth = fs.existsSync(finalSearchString);
  if(truth){
    // res.file(`../images/users/${user}.jpg`)
    // res.sendFile(finalSearchString)
    if(isCorrupted(finalSearchString)){
      res.sendFile(lib.resPath("../images/default.jpg"))
    } else {
      res.sendFile(finalSearchString)
    }
  } else {
    res.sendFile(path.resolve(__dirname,`../images/default.jpg`))
  }
})
router.post("/",(req,res) => {
  res.send("Welcome to API session post route")
})
router.get("/*",(req,res) => {
  res.send(`Invalid GET route "${req.path}"`)
})
router.post("/*",(req,res) => {
  res.send(`Invalid POST route "${req.path}"`)
})

module.exports = router
