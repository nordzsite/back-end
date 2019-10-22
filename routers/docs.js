const express = require('express')
const router = express.Router();
const lib = require("../core/lib")
const {promisify} = require("util")
const l = console.log;
const path = require("path");
const fs = require("fs");

router.get("/*",(req,res) => {
  // res.send(req.params);
  // let path = req.params[0];
  res.send("Coming soon")
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
