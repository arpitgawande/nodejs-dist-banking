'use strict';
var CONFIG = require('./config');

module.exports = function(){
  //Load CONFIG
  console.log('Server argv:'+ process.argv[2]);
    if(!process.argv[2]){
      console.log('No server information provided');
    } else{
      var server = CONFIG.getServer(process.argv[2]);
      console.log(server);
      process.env.SERVERID = server.SERVERID;
      process.env.HOST = server.HOST;
      process.env.PORT = server.PORT;
    }
};
