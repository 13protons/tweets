var _  = require('lodash')
  , fs = require('fs')
  , Q  = require('q');

var mailgun = new require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOAMAIN
});

emailTo = [
  'catering@slowstogo.com'
];

module.exports = {
  'log': log
}

function log(body) {
  var defer = Q.defer();

  if (body._gotcha){
    defer.resolve({'next': body._next, 'body': body});
    return defer.promise;
  }

  var email = [body.name, ' <postmaster@slowstogo.com>'].join('');

  var _body = fs.readFileSync('./templates/body.html', "utf8");
  body.s = fs.readFileSync('./templates/td-style.txt', "utf8");
  body.requestedTime = new Date().toLocaleString();

  var emailBody = _.template(_body)(body);

  var data = {
    from: email,
    to: emailTo,
    subject: body._subject + ' ' + guestCount(body.guest_count) + ' guests',
    html: emailBody,
    'h:Reply-To': body._replyto
  }

  defer.resolve({'next': body._next, 'body': body});

  // _subject: 'Catering Request',
  // _cc: 'tanya@slowstogo.com',
  // _next: '//slowsbarbq.com/catering/thanks/'

  // Invokes the method to send emails given the above data with the helper library
  mailgun.messages().send(data, function (err, body) {
      //If there is an error, render the error page
      if (err) {
          defer.reject(err);
          console.log("got an error: ", err);
      }
      else {
          defer.resolve({'next': body._next, 'body': body})
          console.log(body);
      }
  });

  return defer.promise;
}

function guestCount(guests){
  if(guests < 50){
    return '< 50';
  } else if (guests < 100){
    return '50-100';
  } else if (guests < 150){
    return '100-150';
  } else {
    return '> 150';
  }
}
