var chai = require('chai');
chai.should();

var menu = require('./fixtures/example_menu.json').menu;
var untappd = require('../scripts/untappd.js');

describe('#untappd', function(){
  describe('Extract Menu Info', function(){
    var processedMenu;
    before(function(){
      processedMenu = untappd.__extractMenuInfo(menu, [7]);
    })

    it('should preserve menu boilerplate we care about', function(){
      var props = [
        'id',
        'uuid',
        'name',
        'description',
        'draft',
        'unpublished',
        'created_at',
        'updated_at'
      ]
      props.forEach(function(prop){
        processedMenu[prop].should.equal(menu[prop]);
      })
    })

    it('should have extracted 2 beers', function(){
      processedMenu.beers.length.should.equal(2);
    });
  })
});
