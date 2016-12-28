var _ = require('lodash')
  , Q = require('q');

module.exports = (function() {
  this.get = function(url){
      return fetch(url)
        .then(icalToJson, _error)
        .then(extractTimeline)
  }

  this.extractTimeline = function(json){
    // format timeline of events
  }

  this.icalToJson = function(raw){
    // transforms raw ical data to json representation
    // returns json
  }


  this.fetch = function(url) {
    // get ical data from a given url
    // return a promise
  }

  this._error = function(err){
    // handle err
  }

  return this;
})()
