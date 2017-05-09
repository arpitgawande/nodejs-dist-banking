'use strict';

var CONFIG = {};

CONFIG.SERVER0 = {
  SERVERID: 0,
  HOST: '127.0.0.1',
  PORT: '4140'
};

CONFIG.SERVER1 = {
  SERVERID: 1,
  HOST: '127.0.0.1',
  PORT:  '4141'
};

CONFIG.SERVER2 = {
  SERVERID: 2,
  HOST: '127.0.0.1',
  PORT:  '4142'
};

CONFIG.getServer = function(serverId){
  //console.log('serverId:'+serverId);
  var server = {};
  if(Number(serverId) === 0){
    server.SERVERID = CONFIG.SERVER0.SERVERID;
    server.HOST = CONFIG.SERVER0.HOST;
    server.PORT = CONFIG.SERVER0.PORT;
  } else if(Number(serverId) === 1){
    server.SERVERID = CONFIG.SERVER1.SERVERID;
    server.HOST = CONFIG.SERVER1.HOST;
    server.PORT = CONFIG.SERVER1.PORT;
  } else if(Number(serverId) === 2){
    server.SERVERID = CONFIG.SERVER2.SERVERID;
    server.HOST = CONFIG.SERVER2.HOST;
    server.PORT = CONFIG.SERVER2.PORT;
  } else{
    server.SERVERID = '';
    server.HOST = '';
    server.PORT = '';
  }
  return server;
};

module.exports = CONFIG;
