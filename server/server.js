'use strict';
var net = require('net');
var shortid = require('shortid');
console.log('Current Env: ' + process.env.NODE_ENV);
/* Load server configurations */
require('./init')();
/* Get server network configuration */
var CONFIG = {};
/* Load appropriate config file */
if(process.env.NODE_ENV === 'production'){
  CONFIG = require('./config-prod');
} else{
  CONFIG = require('./config-test');
}
/* Data store */
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/test');
require('./account');
var Account = mongoose.model('Account');
/* Load function definations */
var operation = require('./operation.js');

/* Reset inSessionFlag for all accounts */
Account.resetInSessionFlag();

/* Operation codes */
var checkSession = '00';
var open    = '01';var start   = '02';var credit  = '03';var debit   = '04';
var balance = '05';var finish  = '06';var exit    = '07';

/* Make DB connection */
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
  console.log(' ***** CONNECTED to MongoDb test ******');
  var HOST = process.env.HOST;
  var PORT = process.env.PORT;
  if(HOST || PORT){
    console.log(HOST);
    console.log(PORT);
    // Create a server instance, and chain the listen function to it
    // The function passed to net.createServer() becomes the event handler for the 'connection' event
    // The sock object the callback function receives UNIQUE for each connection
    net.createServer(function(sock){
      // We have a connection - a socket object is assigned to the connection automatically
      console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
      sock.id = shortid.generate();
      /* For storing session information */
      var session = {isExist:false};
      sock.session = session;
      /* Socket to connect other server */
      var remoteSocket = new net.Socket();
      var connected = false;

      var getRemoteConn = function(remoteSocket, serverId, callback){
      console.log('----- Starting new REMOTE Connection to: ' + serverId); 
      var server = CONFIG.getServer(serverId);
      if(server && !connected){
        remoteSocket.connect(server.PORT, server.HOST, function() {
          console.log('CONNECTED TO: ' + server.PORT + ':' + server.HOST);
          connected = true;
          callback();
        });
        }
      };

      /* Handle incoming data on Server */
      sock.on('data', function(data) {
        console.log(' --- DATA Received ' + sock.remoteAddress + ': ' + data);
        console.log('THIS SOCKET ID:' + sock.id);

        data = data.toString();
        var command = data.slice(0,2);
        var accountName = '';
        var amount = 0;
        var sessionExist = false;

        //Check if request for other server
        if(command === open || command === start){
          accountName = data.slice(2);
          //Get clients desired server
          let serverId = operation.getServerId(accountName);
          console.log('process.env.SERVERID:'+ process.env.SERVERID);
          console.log('serverId:' + serverId);
          //Open Account
          if(command === open){
            console.log('**** Open function****');
            //Get clients desired server
            if(process.env.SERVERID && (Number(serverId) === Number(process.env.SERVERID))){
              console.log('Local Call ---->');
              operation.openFunction(sock, accountName);
            } else{
              console.log('Remote call ---->');
              getRemoteConn(remoteSocket, serverId, function(){
                remoteSocket.write(data);
              });                 
            }
            
          }
          //Start Customer session
          else if(command === start){
            console.log('**** Start function****');
            if(!sock.session.isExist){
              //Get clients desired server
              let serverId = operation.getServerId(accountName);
              console.log('process.env.SERVERID:'+ process.env.SERVERID);
              console.log('serverId:' + serverId);
              //Store serverId in session
              sock.session.serverId = serverId;
              //If this server
              if(Number(sock.session.serverId) === Number(process.env.SERVERID)){
                console.log('Local Call----->');
                console.log('serverId:'+ serverId);
                operation.startFunction(sock, accountName, serverId);
                //If another server
              }else{
                console.log('Remote Call----->');
                //Send client data to the server it want to start session with.
                getRemoteConn(remoteSocket, serverId, function(){
                  //create new session
                  var session = {isExist:true};
                  session.remoteSocket = remoteSocket;
                  remoteSocket.write(data);
                    //sock.write(remoteData);
                  session.accountName = accountName;
                  session.serverId = serverId;
                  sock.session = session;
                });
              }
            } else{
              sock.write('Session already exist');
            }
          }
        }
        //Credit account
        else if(command === credit){
          console.log('****Credit function****');
          amount = Number(data.slice(2));
          console.log('Credit ammount:' + amount);
          if(amount === 0){
            console.log('Nothing to be done zero value');
            sock.write('Nothing to be updated since credit amount is 0');
          } else {
            if(sock.session.isExist){
              let serverId = sock.session.serverId;
              //if this server
              if(Number(sock.session.serverId) === Number(process.env.SERVERID)){
                let accountName = sock.session.accountName;
                operation.creditFunction(sock, accountName, amount);
              } //else send to remote
              else{
                remoteSocket.write(data);
              }
            }else{
              let message = 'Session does not exist';
              sock.write(message);
            }
          }
        }
        //Debit Account
        else if(command === debit){
          console.log('****Debit function****');
          amount = Number(data.slice(2));
          console.log('Credit ammount:' + amount);
          if(amount === 0){
            console.log('Nothing to be done zero value');
            this.sock.write('Account Updated');
          } else {
            if(sock.session.isExist){
              let serverId = sock.session.serverId;
              //if this server
              if(Number(sock.session.serverId) === Number(process.env.SERVERID)){
                let accountName = sock.session.accountName;
                operation.debitFunction(sock, accountName, amount);
              } //else check other serverId
              else{
                console.log('Remote Call----->');
                remoteSocket.write(data);
              }
            }else{
              let message = 'Session does not exist';
              sock.write(message);
            }
          }
        }
        //Check Balance of Account
        else if(command === balance){
          console.log('**** Balance function ****');
          //console.log(sock.session);
          if(sock.session.isExist){
            let serverId = sock.session.serverId;
            //if this server
            console.log('sock.session.serverId:'+sock.session.serverId);
            console.log('process.env.SERVERID:'+ process.env.SERVERID);
            if(Number(sock.session.serverId) === Number(process.env.SERVERID)){
              console.log('Local Call----->');
              accountName = sock.session.accountName;
              operation.balanceFunction(sock,accountName);
            } //else check other serverId
            else{
              console.log('Remote Call----->');
              remoteSocket.write(data);
            }
          }else{
            let message = 'Session does not exist';
            sock.write(message);
          }
        }
        //Finish Customer Session
        else if(command === finish){
          console.log('**** Finish function ****');
          if(sock.session.isExist){
            let serverId = sock.session.serverId;
            //if this server
            if(Number(serverId) === Number(process.env.SERVERID)){
              console.log('Local Call----->');
              let accountName = sock.session.accountName;
              operation.finishFunction(sock, accountName);
            } //else check other serverId
            else{
              console.log('Remote Call----->');
              //clearlocal and remote session
              remoteSocket.write(data);
              connected = false;
              sock.session = {isExist:false};
            }
          }else{
            let message = 'Session does not exist';
            sock.write(message);
          }
        }
        //Exit/Close client session
        else if(command === exit){
          console.log('**** Exit function ****');
          console.log('Closing client connection to client:' + sock.remoteAddress + ':' + sock.remotePort);
          sock.end('Goodbye!!');
        }
        else{
          console.log('Wrong Command');
        }
     });

      // Remove the client from the list when it leaves
      sock.on('end', function () {
        console.log('***** ENDING CONNECTION *******');
        if(sock.session.isExist){
          let accountName = sock.session.accountName;
          sock.session = {isExist:false};
          console.log('accountName:' + accountName);
          if(accountName){
            Account.findOne({
              accountName: accountName
            }, function (err, account) {
              if (err) {
                console.log('Error searching account: ' + err);
              } else if(account){
                account.inSessionFlag = false;
                account.save(function(err, obj){
                  if(err){
                    console.log('Error saving account' + err);
                  } else{
                    console.log('inSessionFlag has been reset for: ' + account.accountName);
                  }
                });
              }else{
                console.log('Account "' + accountName + '" does not exist in DB');
              }
            });
          } else{
            console.log('No client state exist, everything is clean');
          }
        }
      });
      // Add a 'close' event handler to this instance of socket
      sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
      });

      /*
        Remote connection events
       */
      remoteSocket.on('data', function(data) {
        console.log('Data on server from other server:"' + data + '"');
        sock.write(data);
        if(!connected) remoteSocket.destroy();
      });

      remoteSocket.on('error', function(error) {
        let data = 'Error in server connection';
        sock.write(data);
      });

      // Add a 'close' event handler for the client socket
      remoteSocket.on('close', function(){
        console.log('Connection to remote server is closed');
      });
      // Add a 'end' - happen when server closes connection
      remoteSocket.on('end', function(){
      });

    }).listen(PORT, HOST);

    console.log('Server listening on ' + HOST +':'+ PORT);
  } else {
    console.log('Error creating server, HOST:'+ HOST +'; PORT:'+ PORT );
    mongoose.connection.close();
  }
});
