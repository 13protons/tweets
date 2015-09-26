var env = process.env.RACK_ENV;

var express = require('express')
  , compression = require('compression')
  , Twitter = require('twitter')
  , fs = require('fs')
  , _ = require('lodash')
  , Q = require('q')
  , ig = require('instagram-node').instagram()
  , app = express();

var apicache = require('apicache').options({ debug: true }).middleware;

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

ig.use({ client_id: process.env.INSTAGRAM_ID,
         client_secret: process.env.INSTAGRAM_SECRET });

app.use(compression()); //gzip!

app.use(function(req, res, next){
  var whitelist = ['localhost:4000', 'localhost:3000', 'localhost:8080', 'slowsbarbq.com', 'moss-willow.cloudvent.net']
  var host = req.get('origin');
  if(host == undefined){
    host = req.get('host');
  }
  //console.log('host', host)
  whitelist.forEach(function(val, key){
    if (host.indexOf(val) > -1){
      res.setHeader('Access-Control-Allow-Origin', host);
    }
  })

  //res.setHeader('Access-Control-Allow-Origin', '*');

  next();
});

app.get("/user/:name", apicache('2 hours'), function(req, res, next){
  instagramUserByName(req.params.name).then(function(data){
    res.send(data);
  }, function(err){
    res.status(404).send(err);
  })
})

app.get("/photos/:user", apicache('30 minutes'), function(req, res, next){
  instagramUserByName(req.params.user).then(function(data){

    ig.user_media_recent(data.id, {count: 10}, function(err, medias, pagination, remaining, limit) {
      if(err){
        console.log('error: ', err);
        res.status(500).send({'error ': err});
      }

      output = _.map(medias, function(val, i){
        var caption = '';
        if (val.caption){
          caption = val.caption.text;
        }

        return {
          type: val.type || 'image',
          images: val.images || false,
          location: val.location || false,
          posted: val.created_time,
          caption: caption
        }
      })

      //console.log('media: ', medias);

      res.send(output);
    });

  }, function(err){
    res.status(404).send(err);
  })

})

app.get("/recent/:handle", apicache('30 minutes'), function(req, res, next){
  recentTweets(req.params.handle).then(function(data){
    res.send(trimTweets(data));
  }, function(err){
    res.status(404).send(err);
  })
})

app.get("/media/:handle", apicache('30 minutes'), function(req, res, next){
  console.time('getMedia'); // Track how long this takes!
  var startTime = Date.now();

  console.log(req.params.handle)
  media_timeline(req.params.handle)
    .then(function(data){
      console.timeEnd('getMedia'); // How long did it take?
      var endTime = Date.now()

      res.send({
        'created_at': endTime,
        'generation_time': (endTime - startTime) + 'ms',
        'cached_until': endTime + (20 * 60 * 1000),
        'tweets': data
      })
    }, function(error){
      res.status(500).send({'error': data})
    })

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

var port = process.env.PORT || 3000;
app.listen(port);

console.log("listening on port " + port);


////////
/// helpers ============================

// returns an array of possible user names
function instagramUserByName(name){
  var defer = Q.defer();

  ig.user_search(name, function(err, users){
    if(err){
      console.log('error: ', err);
      defer.reject(err);
    } else {
      var matched = false;
      var user = _.filter(users, function(val, i){
        return val.username === name;
      })
      if(user.length == 1){
        defer.resolve(user[0]);
      } else {
        defer.reject('matching user not found');
      }

    }
  });

  return defer.promise;
}


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
    hide_thread: true,
    maxwidth: 350
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

function recentTweets(handle){
  var defer = Q.defer();
  var params = {
    screen_name: handle,
    trim_user: true,
    count: 10,
    include_rts: true,
    include_entities: true
  };

  client.get('statuses/user_timeline', params, function(error, tweets, response){
    if (error) {
      defer.reject(error);
    } else {
      defer.resolve(tweets)
    }
  });

  return defer.promise;

}

function trimTweets(tweets){
  return _.map(tweets, function(val, i){
    var tweet = {
      created_at: val.created_at,
      id_str:     val.id_str,
      text:       val.text,
      source:     'twitter',
      media:      _.get(val, 'entities.media[0].media_url', '')
    }
    return tweet;
  })
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


function media_timeline(handle){
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
      var _tweets = [];

      withMedia(tweets).forEach(function(tweet){
        if(_tweets.length < maxCards) {
          _tweets.push(tweet);
        }
      })

      defer.resolve(_tweets)

    } else {
      defer.reject(error);
    }
  });

  return defer.promise;
}
