'use strict';

var CONFIG = {};
module.exports = function(){
  
  if(process.env.NODE_ENV === 'production'){
    CONFIG = require('./config-prod');
  } else{
    CONFIG = require('./config-test');
  }
  //Load CONFIG
  console.log('Server argv:'+ process.argv[2]);
    if(!process.argv[2]){
      console.error('No server information provided');
    } else{
      var server = CONFIG.getServer(process.argv[2]);
      console.log(server);
      process.env.SERVERID = server.SERVERID;
      process.env.HOST = server.HOST;
      process.env.PORT = server.PORT;
    }
};
