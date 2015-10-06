var Twitter = require('twitter')
  , fs = require('fs')
  , _ = require('lodash')
  , Q = require('q');

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

module.exports = {
  'settled': settled,
  'withMedia': withMedia,
  'embed': embed,
  'recentTweets': recentTweets,
  'trimTweets': trimTweets,
  'timeline': timeline,
  'media_timeline': media_timeline
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
