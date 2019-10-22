const express = require('express');
const l = console.log;
const bodyParser = require("body-parser");
const app = express();
const fs = require('fs')
const cors = require('cors');
const rocket = require("./core/rocket");
const busboy = require("express-busboy")
const session = require("express-session");
const jwt = require("jsonwebtoken")
const multer = require("multer");
const upload= multer();
const lib = require("./core/lib");
const Routers = {
  "main":require("./routers/main"),
  "session":require("./routers/session"),
  "users":require("./routers/users")
};
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo(session)
const mongodb = require("mongodb");
const {MongoClient} = mongodb;
// const client = new MongoClient("mongodb://localhost")
// const StoreClient = new MongoClient("mongodb://localhost")
// const MongoStoreClient = new MongoStore({client:StoreClient})
// const client = new MongoClient("mongodb://localhost",{useNewUrlParser:true})

// Constants
const MONGO_CONFIG = {
  useNewUrlParser:true
}
const KEYS = require("./keys/keys.json")
const PORT = process.env.PORT || 9000;

// Middleware
app.use(rocket.tools)
app.use(cors())
app.use(rocket.logger);
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
// app.use(upload.any())
app.use("/docs/",require("./routers/docs"));
try {
  app.use(session({
    store:new MongoStore({url:"mongodb://localhost/store"}),
    secret:KEYS.sessions,
    resave: false,
    saveUninitialized: false
  }))
} catch (e) {
  console.log('e')
}
app.use(bodyParser.text())
lib.plugRouters(Routers,app,"/api/") // Plug in the routers
app.use("/auth",require("./routers/auth"))




// Routes
app.get("/",(req,res) => {
  // res.send("Welcome to API")
  // res.file("public/index.html")
  res.file("views/index.html")
})
app.get("/session",(req,res) => {
  if (req.session.user == undefined) {
    res.redirect("/login")
  } else {
    res.file("views/session.html")
  }
})
app.get("/dummy",(req,res) => {
  res.file("views/dummy.html");
})
app.post("/dummy",(req,res) => {
  res.send(req.body)
})
app.get("/users",(req,res) => {
  res.file("views/users.html")
})
app.get("/change/*",(req,res,next) => {
  if(req.session.user == undefined){
    res.redirect('/')
  } else {
    next()
  }
})
app.get("/change/credentials",(req,res) => {
  // res.send("Authorised")
  res.file("views/credentials.html");
})
// app.get("/test",async (req,res) => {
//   // req.session.main = "test123"
//   try {
//     let connection = await client.connect();
//     let collection = connection.db("main").collection('test');
//     let data = await collection.find().toDocs()
//     res.send(data);
//     client.close()
//   } catch (e) {
//     res.send(e)
//     l('kjlsfd');
//     throw e
//   }
// })
app.get("/test",(req,res) => {
  res.send("Hello world")
})
app.get("/login",(req,res) => {
  res.file("views/login.html")
})

app.get("/*",(req,res) => {
  // res.send(`Invalid GET route "${req.path}"`)
  let path = req.path;
  path = path.replace(new RegExp("%20","g")," ")
  if(fs.existsSync("public/"+path)){
    res.file('public/'+path)
  } else if (path[0]=="."){
    res.send("'.' files are forbidden")
  } else {
    res.status(404)
    l(path)
    res.file("html/404.html")
  }
})
app.post("/*",(req,res) => {
  res.send(`Invalid POST route "${req.path}"`)
})

app.listen(PORT,() => {
  l("Server (hopefully) running on "+PORT)
})
