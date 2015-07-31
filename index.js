var env = process.env.RACK_ENV;

var express = require('express')
  , compression = require('compression')
  , Twitter = require('twitter')
  , fs = require('fs')
  , _ = require('lodash')
  , Q = require('q')
  , app = express();

var apicache = require('apicache').options({ debug: true }).middleware;

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

app.use(compression()); //gzip!

app.use(function(req, res, next){
  var whitelist = ['localhost:4000', 'localhost:8080', 'slowsbarbq.com']
  var host = req.get('host');

  whitelist.forEach(function(val, key){
    if (host.indexOf(val) > -1){
      res.setHeader('Access-Control-Allow-Origin', host);
    }
  })

  res.setHeader('Access-Control-Allow-Origin', '*';

  next();
});

app.get("/cards/:handle", apicache('20 minutes'), function(req, res, next){

  console.time('getEmbends'); // Track how long this takes!
  var startTime = Date.now();

  timeline(req.params.handle)
    .then(function(data){
      console.timeEnd('getEmbends'); // How long did it take?
      var endTime = Date.now()

      res.send({
        'created_at': endTime,
        'generation_time': (endTime - startTime) + 'ms',
        'cached_until': endTime + (20 * 60 * 1000),
        'cards': data
      })
    }, function(error){
      res.status(500).send({'error': data})
    })

})

app.use(function(req, res, next){ res.sendfile('./public/index.html'); })

var port = process.env.PORT || 8080;
app.listen(port);

console.log("listening on port " + port);


////////
/// helpers ============================


function settled(results) {
  var embeds = [];
  results.forEach(function (result) {
    if (result.state === "fulfilled") {
      console.log('got embed code for ', result.value.url);
      embeds.push({
        url: result.value.url,
        html: result.value.html
      });
    } else {
      console.log('error: ', result.reason);
    }
  });
  return embeds;
}

function withMedia(tweets) {
  return _.filter(tweets, function(t) {
    if(t.entities.media) {
      return t;
    }
  });
}

function embed(tweet){
  var defer = Q.defer();

  var params = {
    id: tweet.id_str,
    omit_script: true,
    hide_thread: true
  }
  //console.log(params)
  client.get('statuses/oembed', params, function(error, tweets, response){
    if (error) {
      console.log('cannot get embed code for ', tweet.id_str)
      defer.reject(error);
    } else {
      defer.resolve(tweets);
    }
  });
  return defer.promise;
}

function timeline(handle){
  var defer = Q.defer();
  var maxCards = 10;
  var params = {
    screen_name: handle,
    trim_user: true,
    count: 100,
    include_rts: true,
    include_entities: true
  };

  client.get('statuses/user_timeline', params, function(error, tweets, response){
    if (!error) {
      var _embeds = [];

      withMedia(tweets).forEach(function(tweet){
        if(_embeds.length < maxCards) {
          _embeds.push(embed(tweet));
        }
      })

      Q.allSettled(_embeds)
      .then(settled)
      .done(function(embeds){
        console.log('all done')
        defer.resolve(embeds)
      });

    } else {
      defer.reject(error);
    }
  });

  return defer.promise;
}
