var _  = require('lodash')
  , fs = require('fs')
  , Q  = require('q');

var defaultBody = require('./default.js');

var mailgun = new require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOAMAIN
});

var emailFrom = 'postmaster@slowstogo.com';
var emailTo = 'catering@slowstogo.com';

module.exports = {
  'log': log
}

function log(body) {
  body = _.assign({}, defaultBody, body);
  var defer = Q.defer();

  if (body._gotcha){
    console.log('gotchya!')
    defer.resolve({'next': body._next, 'body': body});
    return defer.promise;
  }

  Q.allSettled([requestEmail(body), confirmEmail(body)])
    .then(function (results) {
      var output = {'next': body.confirm, 'messages': []}
      var errors = [];
      results.forEach(function (result) {
        //google analytics here
        if (result.state === "fulfilled") {
          output.messages.push(result.value);
        } else {
          errors.push(result.reason);
          output.error = errors;
        }
      });

      defer.resolve(output);
    });

  // confirmEmail(body).then(function(results){
  //
  // }, function(err){
  //   defer.reject(err);
  // })

  return defer.promise;
}

function requestEmail(body){
  var defer = Q.defer();
  var email = [body.details.name, ' <'+emailFrom+'>'].join('');

  var _body = fs.readFileSync('./templates/'+body.service.type+'/template.html', "utf8");
  var _slug = fs.readFileSync('./templates/'+body.service.type+'/slug.html', "utf8");
  var _map = fs.readFileSync('./templates/'+body.service.type+'/map.html', "utf8");

  body.s = fs.readFileSync('./templates/td-style.txt', "utf8");
  body.b = fs.readFileSync('./templates/separator-style.txt', "utf8");
  body.requestedTime = new Date().toLocaleString();

  body.slug = _.template(_slug)(body);
  body.map = _.template(_map)(body);
  var emailBody = _.template(_body)(body);

  var data = {
    from: email,
    to: body.details.email, //emailTo + ', ' + body.service.cateringEmails,
    subject: body.slug,
    html: emailBody,
    'h:Reply-To': body.details.email
  }

  // Invokes the method to send emails given the above data with the helper library
  mailgun.messages().send(data, function (err, response) {
      //If there is an error, render the error page
      if (err) {
          defer.reject(err);
          console.log("got an error: ", err);
      }
      else {
          defer.resolve(response)
          console.log(response);
      }
  });

  return defer.promise;
}


function confirmEmail(body){
  var defer = Q.defer();

  var _body = fs.readFileSync('./templates/confirm/template.html', "utf8");
  var _slug = fs.readFileSync('./templates/confirm/slug.html', "utf8");
  body.s = fs.readFileSync('./templates/td-style.txt', "utf8");
  body.b = fs.readFileSync('./templates/separator-style.txt', "utf8");
  body.emailTo = emailTo;

  body.slug = _.template(_slug)(body);
  var emailBody = _.template(_body)(body);

  var data = {
    from: emailFrom,
    to: body.details.email,
    subject: body.slug,
    html: emailBody,
    'h:Reply-To': emailTo + ', ' + body.service.cateringEmails,
  }

  // defer.resolve('response')
  // Invokes the method to send emails given the above data with the helper library
  mailgun.messages().send(data, function (err, response) {
      //If there is an error, render the error page
      if (err) {
          defer.reject(err);
          console.log("got an error: ", err);
      }
      else {
          defer.resolve(response)
          console.log(response);
      }
  });

  return defer.promise;
}
