var fs = require('fs')
   , _ = require('lodash')
   , Q = require('q')
   , ig = require('instagram-node').instagram()

ig.use({ client_id: process.env.INSTAGRAM_ID,
         client_secret: process.env.INSTAGRAM_SECRET });

module.exports = {
  'UserByName': instagramUserByName,
  'photos': photos
}


function photos(userName){
  var defer = Q.defer();

  instagramUserByName(userName).then(function(data){

    ig.user_media_recent(data.id, {count: 10}, function(err, medias, pagination, remaining, limit) {
      if(err){
        console.log('error: ', err);
        defer.reject(err);
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

      defer.resolve(output);
    });

  }, function(err){
    defer.reject(err);
  })

  return defer.promise;
}


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
