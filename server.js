//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan');

var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var objectId = require("mongodb").ObjectID;

var mongoose = require("mongoose");
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
var userScheme = new Schema({
    name: {
        type: String,
        required: true,
        minlength:3,
        maxlength:20
    },
    age: {
        type: Number,
        required: true,
        min: 1,
        max:100
    }
}, { versionKey: false });

var User = mongoose.model("User", userScheme);
var jsonParser = bodyParser.json();
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get("/api/users", function(req, res){
  
  mongoose.connect("mongodb://localhost:27017/usersdb");
  User.find({})
    .then(doc => {
        res.send(doc)
        mongoose.disconnect();  // отключение от базы данных
    })
    .catch(err => {
        res.status(500).send();
        mongoose.disconnect();
    });
});


app.get("/api/users/:id", function(req, res){
    var id = new objectId(req.params.id);

    mongoose.connect("mongodb://localhost:27017/usersdb");
    User.findById(id)
      .then(doc => {
        res.send(doc)
        mongoose.disconnect();  // отключение от базы данных
    })
    .catch(err => {
        res.status(500).send();
        mongoose.disconnect();
    });
});
 
app.post("/api/users", jsonParser, function (req, res) {
    if(!req.body) return res.sendStatus(400); 
    var userName = req.body.name;
    var userAge = req.body.age;
    var user =  new User({name: userName, age: userAge});

    mongoose.connect("mongodb://localhost:27017/usersdb");
    user.save()
    .then(function(doc){
        res.send(doc)
        mongoose.disconnect();  // отключение от базы данных
    })
    .catch(function (err){
        res.status(500).send();
        mongoose.disconnect();
    });
});
  
app.delete("/api/users/:id", function(req, res){
    mongoose.connect("mongodb://localhost:27017/usersdb");
    var id = new objectId(req.params.id);
    User.findByIdAndRemove(id)
      .then(doc => {
        res.send(doc)
        mongoose.disconnect();  // отключение от базы данных
    })
    .catch(err => {
        res.status(500).send();
        mongoose.disconnect();
    });
});
 

app.put("/api/users", jsonParser, function(req, res){
    mongoose.connect("mongodb://localhost:27017/usersdb");
    if(!req.body) return res.sendStatus(400);
    var id = new objectId(req.body.id);
    var userName = req.body.name;
    var userAge = req.body.age;
    User.findByIdAndUpdate(id, {name: userName, age: userAge}, {new: true})
      .then(doc => {
        res.send(doc)
        mongoose.disconnect();  // отключение от базы данных
    })
    .catch(err => {
        res.status(500).send();
        mongoose.disconnect();
    });
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
