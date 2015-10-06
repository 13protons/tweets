var express    = require('express')
  , env        = process.env.RACK_ENV
  , bodyParser = require('body-parser')
  , app        = express();

var twitter    = require('./scripts/tweets')
var instagram  = require('./scripts/instagram')
var mail       = require('./scripts/mail')

var apicache   = require('apicache').options({ debug: true }).middleware;

app.use(require('compression')());        // gzip
app.use(require('./scripts/whitelist'));  // whitelist certain domains
app.use( bodyParser.json() );             // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({           // to support URL-encoded bodies
  extended: true
}));

app.post("/contact", function(req, res, next){
  mail.log(req.body).then(function(data){
    if(data.next){
      res.redirect(data.next);
    }
    res.end(data.body);
  }, function(err){
    res.status(404).send(err);
  })
})

app.get("/user/:name", apicache('2 hours'), function(req, res, next){
  instagram.UserByName(req.params.name).then(function(data){
    res.send(data);
  }, function(err){
    res.status(404).send(err);
  })
})

app.get("/photos/:user", apicache('30 minutes'), function(req, res, next){
  instagram.photos(req.params.user).then(function(data){
    res.send(data);
  }, function(err){
    res.status(404).send(err);
  })
})

app.get("/recent/:handle", apicache('30 minutes'), function(req, res, next){
  twitter.recentTweets(req.params.handle).then(function(data){
    res.send(twitter.trimTweets(data));
  }, function(err){
    res.status(404).send(err);
  })
})

// call it a 404
app.use(function(req, res, next){ res.sendfile('./public/index.html'); })

var port = process.env.PORT || 3000;
app.listen(port);

console.log("listening on port " + port);
