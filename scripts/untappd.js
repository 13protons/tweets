// untappd.setClientId(process.env.UNTAPPD_CLIENT_ID);
// untappd.setClientSecret(process.env.UNTAPPD_CLIENT_SECRET);
// untappd.setAccessToken(process.env.UNTAPPD_ACCESS_TOKEN); // Optional

var _ = require('lodash')
var Q = require('q');
var fs = require('fs');

module.exports = {
  __extractMenuInfo: extractMenuInfo
}

function getMenu(menuId, sections){
  var defer = Q.defer();

  fs.readFile('./example_menu.json', 'utf8', function(err, data){
    if(err) {
      defer.reject(err);
      return;
    }

    defer.resolve(data);
  });

  return defer.promise;
}


function extractBeerInfo(beer, additionalProps){
  /*
  name
  style
  icon
  type
  abv
  price
  description
  */
  return [beer];
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

  var validSections = _.filter(menu.sections, function(section){
    return sections.indexOf(section.id) > -1;
  });

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

  return output;
}
