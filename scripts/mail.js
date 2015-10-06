var _  = require('lodash')
  , fs = require('fs')
  , Q  = require('q');

var mailgun = new require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOAMAIN
});

emailTo = [
  'alan@13protons.com',
  'tanya@slowstogo.com',
  'terry@slowstogo.com'
];

module.exports = {
  'log': log
}



function log(body) {
  var defer = Q.defer();

  var email = [body.name, ' <', body._replyto, '>'].join('');

  var _body = fs.readFileSync('./templates/body.html', "utf8");
  var emailBody = _.template(_body)(body);

  var data = {
    from: email,
    to: emailTo,
    subject: body._subject,
    html: emailBody
  }

  // _subject: 'Catering Request',
  // _cc: 'tanya@slowstogo.com',
  // _next: '//slowsbarbq.com/catering/thanks/'

  //Invokes the method to send emails given the above data with the helper library
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
