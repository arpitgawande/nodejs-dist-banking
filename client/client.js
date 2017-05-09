#!/usr/bin/env node
'use strict';
var chalk = require('chalk');
var prompt = require('prompt');
prompt.colors = false;
prompt.message = '';
var net = require('net');
var CONFIG = {};

console.log('Current Env: ' + process.env.NODE_ENV);
/* Load appropriate config file */
if(process.env.NODE_ENV === 'production'){
  CONFIG = require('./config-prod');
} else{
  CONFIG = require('./config-test');
}

/* Account operations */
var open    = '01'; //• open accountname
var start   = '02'; //• start accountname
var credit  = '03'; //• credit amount
var debit   = '04'; //• debit amount
var balance = '05'; //• balance
var finish  = '06'; //• finish
var exit    = '07'; //• exit

/* Command to command code mapping */
function getCommandCode(commandString){
  if(commandString === 'open')    return open;
  if(commandString === 'start')   return start;
  if(commandString === 'credit')  return credit;
  if(commandString === 'debit')   return debit;
  if(commandString === 'balance') return balance;
  if(commandString === 'finish')  return finish;
  if(commandString === 'exit')    return exit;
}

var serverInfo0 = 'Server Id:' + CONFIG.SERVER0.SERVERID + '; IP:' + CONFIG.SERVER0.HOST + '; Port:' + CONFIG.SERVER0.PORT;
var serverInfo1 = 'Server Id:' + CONFIG.SERVER1.SERVERID + '; IP:' + CONFIG.SERVER1.HOST + '; Port:' + CONFIG.SERVER1.PORT;
var serverInfo2 = 'Server Id:' + CONFIG.SERVER2.SERVERID + '; IP:' + CONFIG.SERVER2.HOST + '; Port:' + CONFIG.SERVER2.PORT;

console.log(chalk.yellow('*********** Server Information *******************'));
console.log(chalk.yellow(serverInfo0));
console.log(chalk.yellow(serverInfo1));
console.log(chalk.yellow(serverInfo2));
console.log(chalk.yellow('**************************************************'));

/* Take server info */
var askServer = function(){
  prompt.get({
  name: 'serverId',
  description: 'Enter the Server ID to connect ("e" to exit)',
  pattern: /^([0-2]$|e$)/g,
  message: 'Please enter correct Server ID ("e" to exit)',
  required: true
}, function (err, result) {
  if (err) {
    console.log(err);
    return 1;
  }
  //console.log('Server ID: ' + result.serverId);
  if(result.serverId === 'e'){
    process.exit();
  }
  var SERVERID = '';
  var HOST = '';
  var PORT = 0;
  //Server Id starts from 0
  var serverId = result.serverId - 1;
  //Get Server Details
  var server = CONFIG.getServer(result.serverId);
  SERVERID = server.SERVERID;
  HOST = server.HOST;
  PORT = server.PORT;
  //console.log('"Host:"' + HOST + '; "Port:"' + PORT);
  
  /* Send data to server */
  var sendData = function(clientSocket, data){
      //console.log('dataToSend:' + data);
      //Create Buffer
      var buf = new Buffer(data.length);
      // Write buffer over socket
      buf.write(data);
      clientSocket.write(buf);
    };

  /* Take command for banking operations */  
  var askCommand = function(clientSocket, sendData){
    prompt.get({
      name: 'command',
      description: 'Enter the Command',
      pattern: /^(open\s[^\s]+$|start\s[^\s]+$|debit\s[^\s]+$|credit\s[^\s]+$|balance$|finish$|exit$)/g,
      message: 'Please enter correct operation',
      required: true,
      before: function(value) { return value.split(' ');}
    }, function (err, result1) {
      if (err) {     
        console.log(err);
        return 1;
      }
      console.log('Command: ' + result1.command);
      let commandString = result1.command[0];
      var data = '';
      /* Open Account */
      if(commandString === 'open'){
        let accountName = result1.command[1];
        let command = getCommandCode(commandString);
        data = command.concat(accountName);
        sendData(clientSocket, data);
      }
      /* Start Account */
      else if(commandString === 'start'){
        let accountName = result1.command[1];
        let command = getCommandCode(commandString);
        data = command.concat(accountName);
        sendData(clientSocket, data);
      }
      /* Credit Account */
      else if(commandString === 'credit'){
        let amount = result1.command[1];
        let command = getCommandCode(commandString);
        data = command.concat(amount);
        sendData(clientSocket, data);
      }
      /* Debit Account */
      else if(commandString === 'debit'){
        let amount = result1.command[1];
        let command = getCommandCode(commandString);
        data = command.concat(amount );
        sendData(clientSocket, data);
      }
      /* Check balance of Account */
      else if(commandString === 'balance'){
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command;
        sendData(clientSocket, data);
      }
      /* Finish Transaction */
      else if(commandString === 'finish'){
        let command = getCommandCode(commandString);
        data = command;
        sendData(clientSocket, data);
      }
      /* Exit Application */
      else if(commandString === 'exit'){
        let command = getCommandCode(commandString);
        data = command;
        sendData(clientSocket, data);
      }
    });
  };

  /* Create connection to server */
  if(HOST && PORT){
    var client = new net.Socket();
    client.connect(PORT, HOST, function() {
      console.log('CONNECTED TO: ' + HOST + ':' + PORT);
      /* Call the Command prompt */
      askCommand(client, sendData);
    });

    client.on('error', function(error) {
      console.log(chalk.red('Error in connecting "' + HOST + ':'+ PORT +'", try other server'));
      /* Ask for server */
      askServer();
    });

    /* On receving data from server */
    client.on('data', function(data) {
      console.log(chalk.white('---- Server Response ----'));
      console.log(chalk.yellow(data));
      console.log(chalk.white('-------------------------'));
      /* Ask for command after getting response */
      askCommand(client, sendData);
    });
    // Add a 'close' event handler for the client socket
    client.on('close', function(){
    });
    // Add a 'end' - happen when server closes connection
    client.on('end', function(){
      prompt.stop();
      console.log(chalk.red('Connection closed'));
      process.exit();
    });
  }
});
};

/* Start application by first asking server details */
askServer();
