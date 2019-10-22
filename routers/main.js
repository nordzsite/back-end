const express = require('express')
const router = express.Router();
const lib = require("../core/lib")
const {promisify} = require("util")
const l = console.log;

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
