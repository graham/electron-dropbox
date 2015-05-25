var ElectronDropboxFrontend = (function() {
    // node libs.
    var fs = require('fs');
    var ipc = require('ipc');

    // third-party lib.
    var dbox = require('dbox');
    var config = JSON.parse(fs.readFileSync("dbconfig.json"));
    var dbapp = dbox.app(config);

    function uuid(){
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    };
    
    var authorize = function(cb) {
        var ret = uuid();
        ipc.send('electron-dropbox-do-authorize', ret);
        ipc.once(ret, function(status) {
            console.log("Status: " + status);
            if (cb) {
                cb(status);
            }
        });
    };

    var set_token = function(token) {
        ipc.send("electron-dropbox-set-token", token);
    };

    var is_authorized = function(cb) {
        var ret = uuid();
        ipc.send("electron-dropbox-check-authorize", ret);
        ipc.once(ret, function(arg) {
            if (cb) {
                cb(arg);
            } else {
                console.log(arg);
            }
        });
    };

    var client = function(cb) {
        var ret = uuid();
        ipc.send("electron-dropbox-get-token", ret);
        ipc.once(ret, function(arg) {
            var token = JSON.parse(arg);
            cb(dbapp.client(token));
        });
    };

    var path_to_db = process.env['HOME'] + "/Dropbox/"; // not good enough.
    
    var is_local = function(path, cb) {
        fs.exists(path_to_db + path, function(exists) {
            if (exists) {
                cb(true);
            } else {
                cb(false);
            }
        });
    };

    var is_local_sync = function(path) {
        return fs.existsSync(path_to_db + path);
    };

    var eager_get = function(client, path, cb) {
        if (is_local_sync(path)) {
            var status = 200;
            var reply  = '';
            var metdata = {};
            cb(status, reply, metadata);
        } else {
            client.get(path, function(status, reply, metadata) {
                cb(status, reply, metadata);
            });
        }
    };
    
    var eager_metadata = function(client, path, cb) {
        // replicate the normal dbox call.
    };

    return {
        'authorize':authorize,
        'set_token':set_token,
        'is_authorized':is_authorized,
        'client':client,
        'eager_metadata':eager_metadata,
        'eager_get':eager_get,
        'is_local':is_local
    };
});

module.exports = ElectronDropboxFrontend();
