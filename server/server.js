    'use strict';
    var net = require('net');
    var shortid = require('shortid');
    console.log('Current Env: ' + process.env.NODE_ENV);
    /* Initialize configurations */
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
    var open    = '01';var start   = '02';var credit  = '03';var debit   = '04';
    var balance = '05';var finish  = '06';var exit    = '07';var startrm = '00';

    /* Make DB connection */
    var db = mongoose.connection;

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', function() {
      //console.log(' ***** CONNECTED to MongoDb test ******');
      var HOST = process.env.HOST;
      var PORT = process.env.PORT;
      if(HOST || PORT){
        console.log(HOST);
        console.log(PORT);
        /* Create a server instance, and chain the listen function to it
        * The function passed to net.createServer() becomes the event handler for the 'connection' event
        * The sock object the callback function receives UNIQUE for each connection
        */
        net.createServer(function(sock){
          console.info('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
          sock.id = shortid.generate();
          /* For storing session information */
          var session = {isExist:false};
          sock.session = session;
          /* Socket to connect other server */
          var remoteSocket = {};
          var connected = false;

          /* Handle incoming data on Server from client */
          sock.on('data', function(data) {
            //console.log('THIS SOCKET ID:' + sock.id);
            //console.log(' --- DATA Received ' + sock.remoteAddress + ': ' + data);
            var getRemoteConn = function(serverId, callback){
            console.info('----- REMOTE Connection to server: ' + serverId); 
            let server = CONFIG.getServer(serverId);
            if(server && !connected){
              /* Create new Socket */
              remoteSocket = new net.Socket();  
              /* Connect to remote server */
              remoteSocket.connect(server.PORT, server.HOST, function() {
                console.info('CONNECTED TO: ' + server.PORT + ':' + server.HOST);
                connected = true;
                callback(remoteSocket);
              });
              /*
              * Handle remote server connection events
              */
              remoteSocket.on('data', function(data) {
              console.info('Data on server from other server:"' + data + '"');
              let res = parseInt(data.slice(0,2));
              if(res === 0){
                let serverId = data.slice(2,3);
                //console.info('serverId:' + serverId);
                let accountName = data.slice(3);
                //console.info('accountName:' + accountName);
                let session = {isExist:true};
                session.remoteSocket = remoteSocket;
                session.accountName = accountName;
                session.serverId = serverId;
                sock.session = session;
                sock.write('Starting session for account "' + accountName + '"');          
              } else {
                sock.write(data);
              }
              if(!connected) remoteSocket.destroy();
            });
            
            remoteSocket.on('error', function(error) {
              let data = 'Error in server connection';
              sock.write(data);
              remoteSocket.destroy();
            });
            // Add a 'close' event handler for the client socket
            remoteSocket.on('close', function(){
              console.error('Connection to remote server is closed');
              connected = false;
              remoteSocket.destroy();
            });
            // Add a 'end' - happen when server closes connection
            remoteSocket.on('end', function(){
              connected = false;
              remoteSocket.destroy();
            });

            }
          };

            /* Interprete request */
            data = data.toString();
            var command = data.slice(0,2);
            var accountName = '';
            var amount = 0;
            var sessionExist = false;

            if(command === open || command === start || command === startrm){
              accountName = data.slice(2);
              /* Get clients desired server */
              let serverId = operation.getServerId(accountName);
              //console.log('process.env.SERVERID:'+ process.env.SERVERID);
              //console.log('serverId:' + serverId);
              /* Open Account */
              if(command === open){
                console.log('**** Open function****');
                if(process.env.SERVERID && (Number(serverId) === Number(process.env.SERVERID))){
                  console.log('Local Call ---->');
                  operation.openFunction(sock, accountName, serverId);
                } else{
                  console.log('Remote call ---->');
                  getRemoteConn(serverId, function(remoteSocket){
                    remoteSocket.write(data);
                    connected = false;
                  });                 
                }
                
              }
              /* Start Customer transaction/session */
              else if(command === start){
                console.log('**** Start function****');
                if(!sock.session.isExist){
                  let serverId = operation.getServerId(accountName);
                  //console.log('process.env.SERVERID:'+ process.env.SERVERID);
                  //console.log('serverId:' + serverId);
                  /* Store serverId in session */
                  sock.session.serverId = serverId;
                  //If this server
                  if(Number(sock.session.serverId) === Number(process.env.SERVERID)){
                    console.log('Local Call----->');
                    console.log('serverId:'+ serverId);
                    operation.startFunction(sock, accountName, serverId);
                    
                  }else{//If another server
                    console.log('Remote Call----->');
                    /* Send client data to the server it want to start session with */
                    getRemoteConn(serverId, function(remoteSocket){
                      let newData = startrm.concat(accountName);
                      remoteSocket.write(newData);
                    });
                  }
                } else{
                  sock.write('Session already exist for "'+ sock.session.accountName +'"');
                }
              } else if(command === startrm){
                console.log('*** Start Remote ***');
                operation.startRemote(sock, accountName, serverId);
              }
            }
            /* Credit account */
            else if(command === credit){
              console.log('****Credit function****');
              amount = Number(data.slice(2));
              //console.log('Credit ammount:' + amount);
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
            /* Debit Account */
              else if(command === debit){
                console.log('****Debit function****');
                amount = Number(data.slice(2));
                //console.log('Credit ammount:' + amount);
                  if(sock.session.isExist){
                    let serverId = sock.session.serverId;
                    if(Number(sock.session.serverId) === Number(process.env.SERVERID)){
                      let accountName = sock.session.accountName;
                      operation.debitFunction(sock, accountName, amount);
                    }
                    else{
                      console.log('Remote Call----->');
                      remoteSocket.write(data);
                    }
                  }else{
                    let message = 'Session does not exist';
                    sock.write(message);
                  }
              }
            /* Check Balance */
            else if(command === balance){
              console.log('**** Balance function ****');
              if(sock.session.isExist){
                let serverId = sock.session.serverId;
                if(Number(sock.session.serverId) === Number(process.env.SERVERID)){
                  console.log('Local Call----->');
                  accountName = sock.session.accountName;
                  operation.balanceFunction(sock,accountName);
                }
                else{
                  console.log('Remote Call----->');
                  remoteSocket.write(data);
                }
              }else{
                let message = 'Session does not exist';
                sock.write(message);
              }
            }
            /* Finish Customer transacton/session */
            else if(command === finish){
              console.log('**** Finish function ****');
              if(sock.session.isExist){
                let serverId = sock.session.serverId;
                if(Number(serverId) === Number(process.env.SERVERID)){
                  console.log('Local Call----->');
                  let accountName = sock.session.accountName;
                  operation.finishFunction(sock, accountName);
                }
                else{
                  console.log('Remote Call----->');
                  /* Clear session info */
                  sock.session = {isExist:false};
                  connected = false;
                  remoteSocket.write(data);
                }
              }else{
                let message = 'Session does not exist';
                sock.write(message);
              }
            }
            /* Exit/Close client transaction/session */
            else if(command === exit){
              console.log('**** Exit function ****');
              console.log('Closing connection to client:' + sock.remoteAddress + ':' + sock.remotePort);
              sock.end('Goodbye!!');
            }
            else{
              console.log('Wrong Command');
              sock.write('Wrong Command');
            }
         });

          /* Clean up after client connection is closed */
          sock.on('end', function () {
            console.log('***** ENDING CONNECTION *******');
            if(sock.session.isExist){
              let accountName = sock.session.accountName;
              sock.session = {isExist:false};
              //console.log('accountName:' + accountName);
              if(accountName){
                Account.findOne({
                  accountName: accountName
                }, function (err, account) {
                  if (err) {
                    //console.log('Error searching account: ' + err);
                    return;
                  } else if(account){
                    /* reset session flag for account */
                    account.inSessionFlag = false;
                    account.save(function(err, obj){
                      if(err){
                        //console.log('Error saving account' + err);
                          return;
                      } else{
                        //console.log('inSessionFlag has been reset for: ' + account.accountName);
                        return;
                      }
                    });
                  }else{
                    //console.log('Account "' + accountName + '" does not exist in DB');
                    return;
                  }
                });
              } else{
                //console.log('No client state exist, everything is clean');
                return;
              }
            }
          });
          
          sock.on('close', function(data) {
            console.log('CLOSED: ' + sock.remoteAddress +':'+ sock.remotePort);
          });


        }).listen(PORT, HOST);
        console.log('Server listening on ' + HOST +':'+ PORT);
      } else {
        console.log('Error creating server, HOST:'+ HOST +'; PORT:'+ PORT );
        mongoose.connection.close();
      }
    });
