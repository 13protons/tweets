var Twitter = require('twitter');
var fs = require('fs');
var _ = require('lodash');
var Q = require('q');

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var params = {
  screen_name: 'SlowsBBQ',
  trim_user: true,
  count: 100,
  include_rts: true,
  include_entities: true
};

console.time('getEmbends');

client.get('statuses/user_timeline', params, function(error, tweets, response){
  if (!error) {
    var _embeds = [];

    withMedia(tweets).forEach(function(tweet){
      _embeds.push(embed(tweet));
    })

    Q.allSettled(_embeds)
    .then(settled)
    .done(function(embeds){
      console.log('all done')
      console.timeEnd('getEmbends');
      console.log(embeds)
    });

  } else {
    console.log('error: ', error)
  }
});


// fs.readFile('./temp/response.json', function (err, data) {
//   if (err) {
//     throw err;
//   }
//   var allTweets = JSON.parse(data.toString());
//
//   var tweets = withMedia(allTweets);
//
//   console.log(tweets.length + ' tweets have images.');
//
//   var _embeds = [
//     embed(tweets[0]),
//     embed(tweets[1])
//   ];
//
//   // tweets.forEach(function(tweet){
//   //   _embeds.push(embed(tweet));
//   // })
//
//   Q.allSettled(_embeds)
//   .then(settled)
//   .done(function(embeds){
//     console.log('all done')
//     console.log(embeds)
//   });
//
// });

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
      defer.reject(error);
    } else {
      defer.resolve(tweets);
    }
  });

  return defer.promise;
}
