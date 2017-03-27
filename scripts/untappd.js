// untappd.setClientId(process.env.UNTAPPD_CLIENT_ID);
// untappd.setClientSecret(process.env.UNTAPPD_CLIENT_SECRET);
// untappd.setAccessToken(process.env.UNTAPPD_ACCESS_TOKEN); // Optional

var _ = require('lodash')
var Q = require('q');
var request = require('request');

module.exports = {
  getMenu: getMenu,
  __extractMenuInfo: extractMenuInfo
}

function getMenu(id, sections) {
  let options = {
    url: 'https://business.untappd.com/api/v1/menus/' + id + '?full=true',
    headers: {
      'Authorization': createAuthHeader()
    }
  }

  var defer = Q.defer();

  request(options, function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      defer.resolve(extractMenuInfo(info.menu));
      return;
    }

    var errObj = {
      code: 400,
      msg: 'No menu found with that ID'
    };

    defer.reject(errObj);
  });

  return defer.promise;
}

function createAuthHeader() {
  let token = process.env.UNTAPPD_ACCESS_TOKEN || '';
  let email = process.env.UNTAPPD_EMAIL || '';

  let encoded = new Buffer(email + ':' + token).toString('base64');
  var headerValue = 'Basic ' + encoded;
  return headerValue;
}

function extractBeerInfo(beer, additionalProps){
  beer.containers.map(function(container){
    container.name = container.container_size.name;
    return container;
  })

  return beer;
}

function extractMenuInfo(menu, sections){

  var menuProps = [
    'id',
    'uuid',
    'name',
    'description',
    'draft',
    'unpublished',
    'created_at',
    'updated_at'
  ];

  var output = menuProps.reduce(function(acc, val, i){
    acc[val] = menu[val];
    return acc;
  }, {});

  output.beers = [];

  // if (!menu.unpublished) {
    var validSections = menu.sections;

    if (sections) {
      validSections = _.filter(menu.sections, function(section){
        return sections.indexOf(section.id) > -1;
      });
    }

    output.beers = validSections.reduce(function(acc, val, i){
      var sectionHeader = {
        'section_id': val.id,
        'section_position': val.position,
        'section_name': val.name,
        'section_description': val.description
      }

      val.items.forEach(function(item){
        var output = extractBeerInfo(item, sectionHeader);
        acc = acc.concat(output);
      })
      return acc;
    }, []);
  // }

  return output;
}
