const express = require('express');
const l = console.log;
const path = require('path');
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
const morgan = require('morgan');
const Routers = {
  "main":require("./routers/main"),
  "session":require("./routers/session"),
  "users":require("./routers/users"),
  "class":require("./routers/class")
};
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo(session)
const mongodb = require("mongodb");
const {MongoClient} = mongodb;
const {fields} = require("./core/schema")

// Constants
const MONGO_CONFIG = {
  useNewUrlParser:true
}
const KEYS = require("./keys/keys.json");
const DATA = require("./keys/data.json");
const VIEWS = require("./public/front-end/view-map.json")
const {MONGO_URL,MONGO_MAIN_DB} = DATA;
l(MONGO_URL)
const PORT = process.env.PORT || 9000;

// Middleware
app.use(rocket.tools)
app.use(cors())
// app.use(rocket.logger);
// app.use(express.logger())
app.use(morgan('combined'))
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
// app.use(upload.any())
app.use("/docs/",require("./routers/docs"));
async function main(MONGO_STORE_CLIENT=null){
  if(MONGO_STORE_CLIENT!=null){
    app.use(session({
      store:new MongoStore({
        client:MONGO_STORE_CLIENT,
        url:MONGO_URL+MONGO_MAIN_DB
      }),
      secret:KEYS.sessions,
      resave: false,
      saveUninitialized: false
    }))
  } else {
    app.use(session({
      secret:KEYS.sessions,
      resave: false,
      saveUninitialized: false
    }))
  }
  app.use(bodyParser.text())
  lib.plugRouters(Routers,app,"/api/") // Plug in the routers
  app.use("/auth",require("./routers/auth"))
  // Routes
  app.get("/*.html",(req,res) => {
    let {path} = req;
    if (fs.existsSync("public/front-end/public"+path)) {
      fs.readFile("public/front-end/public"+path,(err,docs) => {
        if (err) res.status(500).send("Some error occured");
        // res.type('html').send(docs.toString())
        docs = docs.toString();
        if (/^((.*?)<!--(.*?)~SessionRequired~(.*?)-->)/g.test(docs) && req.session.uid == undefined) res.file("public/front-end/nosession.html")
        else res.type('html').send(docs.toString())
      })
    } else {
      res.status(404).file('public/front-end/404.html')
    }
  })
  app.get("/private/*",(req,res) => {
    res.status(404).file('public/front-end/404.html')
  })


  //  VIEWS
  lib.simpleBindViews(app,VIEWS.views.session,(req,viewName,viewPath) => {
    console.log(req.session.type)
      if(req.session.uid == undefined) return "nosession.html"
      else return (typeof viewPath == "object") ? viewPath[req.session.type] : viewPath;
  },"public/front-end/"+VIEWS['view-directory'])
  lib.simpleBindViews(app,VIEWS.views['no-session'],(req,viewName,viewPath) => {
    return viewPath
  },"public/front-end/"+VIEWS['view-directory'])

  app.use(express.static("public/front-end/public"))
  // app.get("/",(req,res) => {
  //   // res.send("Welcome to API")
  //   // res.file("public/index.html")
  //   // res.file("views/index.html")
  //   res.file("public/front-end/public/private/assignments.html")
  // })
  // app.get("/class/:id",(req,res) => {
  //   (async function() {
  //     let classId = req.params.id;
  //     let connection = await MongoClient.connect(MONGO_URL);
  //     let collection = connection.db(MONGO_MAIN_DB).collection(COLLECTION.class);
  //     queryObject = {_id:new ObjectID(classId)};
  //     queryObject[`members.${role}s`] = {$in:[req.session.uid]}
  //     let result = await collection.find(queryObject);
  //     if (result.isEmpty()) {
  //       res.file("public/front-end/public/private/404.html")
  //     } else {
  //
  //     }
  //   }());
  // })
  app.post("/dummy",(req,res) => {
    res.send(req.body)
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
      res.file("public/front-end/public/private/404.html")
    }
  })
  app.post("/*",(req,res) => {
    res.send(`Invalid POST route "${req.path}"`)
  })

  app.listen(PORT,() => {
    l("Server (hopefully) running on "+PORT)
  })
}

MongoClient.connect(MONGO_URL,(err,client) => {
  let ERR_STRING = `
=================================================
Running server without MongoDB connection
=================================================
  `;
  if (err) {
    console.log("Error occured in mongoDB connection");
    main().then(() => {
      console.log(ERR_STRING)
    })
  } else {
    main(client).then(() => {
      console.log("MongoDB Store connection success")
    }).catch((err) => {
      if (err.name == "MongoError" || err.name == "MongoNetworkError") {
        main().then(() => {
          console.log(ERR_STRING);
        })
      } else {
        throw err
      }
    })
  }
})
