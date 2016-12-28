module.exports = function(req, res, next){
  var whitelist = ['localhost:4000', 'localhost:3000', 'localhost:8080', 'slowsbarbq.com', 'moss-willow.cloudvent.net']
  var host = req.get('origin');
  if(host == undefined){
    host = req.get('host');
  }
  //console.log('host', host)
  whitelist.forEach(function(val, key){
    if (host.indexOf(val) > -1){
      res.setHeader('Access-Control-Allow-Origin', host);
    }
  });

  next();
}
