'use strict';
var mongoose = require('mongoose');

var account = mongoose.Schema({
accountName: {type: String, unique: true},
currentBalance: Number,
inSessionFlag: {type: Boolean, default: false }
});

account.statics.resetInSessionFlag = function resetInSessionFlag(){
    this.find({
        inSessionFlag: true
    }, function(err, accounts) {
        if (err) {
            console.log('Error searching account: ' + err);
        } else if (accounts) {
            accounts.forEach(function(client, index, theArray) {
                //console.log('theArray[index]:' + theArray[index]);
                theArray[index].inSessionFlag = false;
                theArray[index].save(function(err, account) {
                    if (err) {
                        console.log('Error saving account' + err);
                    } else {
                        console.info('Account "' + account.accountName + '" has been reset:');
                    }
                });
            });
        } else{
            //console.log('Account Data Base it empty');
            return;
        }
    });
};

var Account = mongoose.model('Account', account);

module.exports = Account;