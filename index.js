var express    = require('express')
  , env        = process.env.RACK_ENV
  , bodyParser = require('body-parser')
  , request    = require('request');

var app        = express();

var twitter    = require('./scripts/tweets');
var instagram  = require('./scripts/instagram');
var mail       = require('./scripts/mail');
var catering   = require('./scripts/catering');
var untappd    = require('./scripts/untappd.js');

var apicache   = require('apicache').options({ debug: true }).middleware;

app.use(require('compression')());        // gzip
app.use(require('./scripts/whitelist'));  // whitelist certain domains
app.use( bodyParser.json() );             // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({           // to support URL-encoded bodies
  extended: true
}));

app.get("/menu_widgets/:resource", apicache('2 hours'), function(req, res, next){
  var url = 'https://www.beermenus.com/menu_widgets/' + req.params.resource
  res.setHeader('Access-Control-Allow-Origin', '*');

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.send(body);
    } else {
      res.status(404).send(error);
    }
  })

})

app.post("/contact", function(req, res, next){
  console.log('legacy catering request', req.body);
  mail.log(req.body).then(function(data){
    res.send(data);
  }, function(err){
    res.status(404).send(err);
  })
})

app.use("/catering", function(req, res, next){
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  next();
});

app.options("/catering", function(req, res, next){
  res.send(200);
});

app.post("/catering", function(req, res, next){
  console.log('catering request:', req.body)
  catering.log(req.body).then(function(data){
    res.send(data);
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
  });
})

app.get("/recent/:handle", apicache('30 minutes'), function(req, res, next){
  twitter.recentTweets(req.params.handle).then(function(data){
    res.send(twitter.trimTweets(data));
  }, function(err){
    res.status(404).send(err);
  });
})
// apicache('2 hours'), 
app.get('/beer/:menuId', function(req, res, next){
  untappd.getMenu(req.params.menuId).then(function(data){
    res.json(data);
  }, function(err){
    res.status(err.code).send(err.msg);
  });
});

// call it a 404
app.use(function(req, res, next){ res.sendfile('./public/index.html'); })

var port = process.env.PORT || 3000;
app.listen(port);

console.log("listening on port " + port);
