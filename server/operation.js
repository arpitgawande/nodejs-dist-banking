'use strict';

var mongoose = require('mongoose');
var Account = mongoose.model('Account');

var operation = {};

operation.openFunction = function(clientSocket, accountName, serverId){
  var account = new Account({accountName:accountName, currentBalance:0, inSessionFlag:false});
  account.save(function (err, obj) {
    if (err) {
      console.error('Error saving:' + err);
      if(err.code === 11000){
        clientSocket.write('Account "' + accountName + '" already exist');
        return;
      } else{
        clientSocket.write('Error Opening Account');
      }
    } else if(obj){
      // Write the data back to the socket,
      clientSocket.write('Sucess: Account "' + account.accountName + '" has been created on server "'+ serverId +'"');
    } else{
      // Write the data back to the socket,
      clientSocket.write('Error: Account "' + accountName + ' could not be created on server "'+ serverId +'"');
    }
  });
};

operation.startRemote = function(clientSocket, accountName, serverId){
  Account.findOne({
    accountName: accountName
  }, function (err, account) {
    //console.log('account:' + account);
    if (err) {
      console.error('Error searching account: ' + err);
      clientSocket.write('Account "' + account.accountName + '" does not exist');
      clientSocket.destroy();
      return;
    } else if(account){
      //console.info('account.inSessionFlag:' + account.inSessionFlag);
      if(account.inSessionFlag){
        //console.info('Account "' + account.accountName + '" is in service');
        clientSocket.write('Account "' + account.accountName + '" is in service');
        clientSocket.destroy();
      } else{
        account.inSessionFlag = true;
        account.save(function(err, obj){
          if(err){
            console.error('Error updating sesssion flag: ' + err);
            clientSocket.write('Error updating sesssion flag');
            clientSocket.destroy();
            return;
          } else{
            let session = {isExist:true};
            session.accountName = accountName;
            session.serverId = serverId;
            clientSocket.session = session;
            //console.info('Starting session for account: ' + account.accountName);
            clientSocket.write('00'+serverId+account.accountName);
          }
        });
      }
    } else{
      //console.info('Account "' + accountName + '" does not exist');
      clientSocket.write('Account "' + accountName + '" does not exist');
      clientSocket.destroy();
      return;
    }
  });
};

operation.startFunction = function(clientSocket, accountName, serverId){
  Account.findOne({
    accountName: accountName
  }, function (err, account) {
    //console.log('account:' + account);
    if (err) {
      console.error('Error searching account: ' + err);
      clientSocket.write('Account "' + account.accountName + '" does not exist');
      return;
    } else if(account){
      //console.info('account.inSessionFlag:' + account.inSessionFlag);
      if(account.inSessionFlag){
        //console.info('Account "' + account.accountName + '" is in service');
        clientSocket.write('Account "' + account.accountName + '" is in service');
      } else{
        account.inSessionFlag = true;
        account.save(function(err, obj){
          if(err){
            console.error('Error updating sesssion flag: ' + err);
            clientSocket.write('Error updating session flag');
            return;
          } else{
            let session = {isExist:true};
            session.accountName = accountName;
            session.serverId = serverId;
            clientSocket.session = session;
            //console.info('Starting session for account: ' + account.accountName);
            clientSocket.write('Starting session for account: ' + account.accountName);
          }
        });
      }
    } else{
      //console.info('Account "' + accountName + '" does not exist');
      clientSocket.write('Account "' + accountName + '" does not exist');
      return;
    }
  });
};

operation.creditFunction = function(clientSocket, accountName, creditAmount){
  if(accountName){
    Account.findOne({
      accountName: accountName
    }, function (err, account) {
      if (err) {
        console.error('Error searching account: ' + err);
        clientSocket.write('Account "' + account.accountName + '" does not exist');
      } else if(account){
        account.currentBalance = Math.round((account.currentBalance + creditAmount) * 100)/100;
        account.save(function(err, obj){
          if(err){
            console.error('Error saving account' + err);
            clientSocket.write('Error saving account');
          } else{
            //console.info('Account "' + account.accountName + '" has been credited, New Balance is:' + account.currentBalance);
            clientSocket.write('Account "' + account.accountName + '" has been credited, New Balance is:' + account.currentBalance);
          }
        });
      }else{
        //console.info('Account "' + accountName + '" does not exist');
        clientSocket.write('Account "' + accountName + '" does not exist');
      }
    });
  } else{
    //console.info('Session does not exist');
    clientSocket.write('Session does not exist');
  }
};

operation.debitFunction = function(clientSocket, accountName, debitAmount){
  if(accountName){
    Account.findOne({
      accountName: accountName
    }, function (err, account) {
      if (err) {
        console.error('Error searching account: ' + err);
        clientSocket.write('Account "' + account.accountName + '" does not exist');
      } else if(account){
        if(account.currentBalance < debitAmount){
          //console.info('Account "' + account.accountName + '" dont have enough fund for debit, current balance is:' + account.currentBalance);
          clientSocket.write('Account "' + account.accountName + '" dont have enough fund for debit, current balance is:' + account.currentBalance);
        } else{
          account.currentBalance = Math.round((account.currentBalance - debitAmount) * 100)/100;
          account.save(function(err, obj){
            if(err){
              console.error('Error saving account' + err);
              clientSocket.write('Error saving account');
            } else{
              //console.info('Account "' + account.accountName + '" has been debited, New Balance is:' + account.currentBalance);
              clientSocket.write('Account "' + account.accountName + '" has been debited, New Balance is:' + account.currentBalance);
            }
          });
        }
      }else{
        //console.info('Account "' + accountName + '" does not exist');
        clientSocket.write('Account "' + accountName + '" does not exist');
      }
    });
  }else{
    //console.info('Session does not exist');
    clientSocket.write('Session does not exist');
  }
};

operation.balanceFunction = function(clientSocket, accountName){
  if(accountName){
    Account.findOne({
      accountName: accountName
    }, function (err, account) {
      if (err) {
        console.error('Error searching account: ' + err);
        clientSocket.write('Account "' + account.accountName + '" does not exist');
      } else if(account){
        //console.info('Account "'+ account.accountName + '" Balance is:' + account.currentBalance);
        clientSocket.write('Account "'+ account.accountName + '" Balance is:' + account.currentBalance);
      }else{
        //console.info('Account "' + accountName + '" does not exist');
        clientSocket.write('Account "' + accountName + '" does not exist');
      }
    });
  } else{
    //console.info('Session does not exist');
    clientSocket.write('Session does not exist');
  }
};

operation.finishFunction = function(clientSocket, accountName){
  if(accountName){
    Account.findOne({
      accountName: accountName
    }, function (err, account) {
      if (err) {
        console.error('Error searching account: ' + err);
        clientSocket.write('Account "' + account.accountName + '" does not exist');
      } else if(account){
        account.inSessionFlag = false;
        account.save(function(err, obj){
          if(err){
            console.error('Error updating sesssion flag ' + err);
            clientSocket.write('Error updating session flag');
          } else{
            //console.info('Ending session for account: ' + account.accountName);
            clientSocket.write('Ending session for account: ' + account.accountName);
            clientSocket.session = {isExist:false};
          }
        });
      }else{
        //console.info('Account "' + accountName + '" does not exist');
        clientSocket.write('Account "' + accountName + '" does not exist');
      }
    });
  } else{
    //console.info('Session does not exist');
    clientSocket.write('Session does not exist');
  }
};

/* Hash function to determine server id */
operation.getServerId= function(accountName){
  return (accountName.length%3);
};

module.exports = operation;
