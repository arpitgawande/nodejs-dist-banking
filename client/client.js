#!/usr/bin/env node
'use strict';
var chalk = require('chalk');
var prompt = require('prompt');
prompt.colors = false;
prompt.message = '';
var net = require('net');
var CONFIG =require('./config');

/* Account operations */
var open    = '01'; //• open accountname
var start   = '02'; //• start accountname
var credit  = '03'; //• credit amount
var debit   = '04'; //• debit amount
var balance = '05'; //• balance
var finish  = '06'; //• finish
var exit    = '07'; //• exit

function getCommandCode(commandString){
  if(commandString === 'open') return open;
  if(commandString === 'start') return start;
  if(commandString === 'credit') return credit;
  if(commandString === 'debit') return debit;
  if(commandString === 'balance') return balance;
  if(commandString === 'finish') return finish;
  if(commandString === 'exit') return exit;
}

var serverInfo0 = 'Server Id:' + CONFIG.SERVER0.SERVERID + '; IP:' + CONFIG.SERVER0.HOST + '; Port:' + CONFIG.SERVER0.PORT;
var serverInfo1 = 'Server Id:' + CONFIG.SERVER1.SERVERID + '; IP:' + CONFIG.SERVER1.HOST + '; Port:' + CONFIG.SERVER1.PORT;
var serverInfo2 = 'Server Id:' + CONFIG.SERVER2.SERVERID + '; IP:' + CONFIG.SERVER2.HOST + '; Port:' + CONFIG.SERVER2.PORT;


//clear();
console.log(chalk.yellow('*********** Server Information *******************'));
console.log(chalk.yellow(serverInfo0));
console.log(chalk.yellow(serverInfo1));
console.log(chalk.yellow(serverInfo2));
console.log(chalk.yellow('**************************************************'));
//console.log('User Server Id to connect to server');

//prompt.start();
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
  console.log('Server ID: ' + result.serverId);
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
  //console.log(server);
  SERVERID = server.SERVERID;
  HOST = server.HOST;
  PORT = server.PORT;
  console.log('"Host:"' + HOST + '; "Port:"' + PORT);
    //Send data functon
  var sendData = function(clientSocket, data){
      console.log('dataToSend:' + data);
      //Create Buffer
      var buf = new Buffer(data.length);
      // Write buffer over socket
      buf.write(data);
      console.log(buf);
      clientSocket.write(buf);
      if(data === 'exit'){
        clientSocket.destroy();
      }
    };

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
      //Open Account
      if(commandString === 'open'){
        let accountName = result1.command[1];
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command.concat(accountName);
        sendData(clientSocket, data);
      }
      //Start Account
      else if(commandString === 'start'){
        let accountName = result1.command[1];
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command.concat(accountName);
        sendData(clientSocket, data);
      }
      //Credit Account
      else if(commandString === 'credit'){
        let amount = result1.command[1];
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command.concat(amount);
        sendData(clientSocket, data);
      }
      //Debit Account
      else if(commandString === 'debit'){
        let amount = result1.command[1];
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command.concat(amount );
        sendData(clientSocket, data);
      }
      //balance Account
      else if(commandString === 'balance'){
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command;
        sendData(clientSocket, data);
      }
      //finish Account
      else if(commandString === 'finish'){
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command;
        sendData(clientSocket, data);
      }
      //exit Account
      else if(commandString === 'exit'){
        //Get Command Code
        let command = getCommandCode(commandString);
        data = command;
        sendData(clientSocket, data);
      }
    });
  };

  if(HOST && PORT){
    var client = new net.Socket();
    client.connect(PORT, HOST, function() {
      console.log('CONNECTED TO: ' + HOST + ':' + PORT);
      //Call the Command prompt
      askCommand(client, sendData);
    });

    client.on('error', function(error) {
      console.log(chalk.red('Error in connection, try other server'));
      askServer();
    });

    // Add a 'data' event handler for the client socket
    // data is what the server sent to this socket
    client.on('data', function(data) {
      console.log(chalk.white('---- Server Response ----'));
      console.log(chalk.yellow(data));
      console.log(chalk.white('-------------------------'));
      askCommand(client, sendData);
    });
    // Add a 'close' event handler for the client socket
    client.on('close', function(){
      // prompt.stop();
      // console.log(chalk.red('Connection closed'));
      // process.exit();
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
askServer();
