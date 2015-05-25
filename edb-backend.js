var ElectronDropbox = (function() {
    // node libs.
    var fs = require('fs');
    var ipc = require('ipc');

    // third-party lib.
    var dbox = require('dbox');
    var config = JSON.parse(fs.readFileSync("dbconfig.json"));
    var dbapp = dbox.app(config);

    // The browser window object so we can spawn a new frame.
    var BrowserWindow = require('browser-window');

    // Some singleton stuff to keep track of what is going on.
    var DBState = {};

    var save_config = function() {
        fs.writeFileSync("dbsession.json", JSON.stringify(DBState));
    };

    var load_config = function() {
        if (fs.existsSync("dbsession.json")) {
            DBState = JSON.parse(fs.readFileSync("dbsession.json"));
        } else {
            DBState = {};
        }
    };

    ipc.on("electron-dropbox-set-token", function(caller_event, arg) {
        DBState.access_token = arg;
    });

    ipc.on("electron-dropbox-get-token", function(caller_event, arg) {
        caller_event.sender.send(arg, JSON.stringify(DBState.access_token));
    });

    ipc.on("electron-dropbox-check-authorize", function(caller_event, arg) {
        if (DBState.access_token == undefined) {
            caller_event.sender.send(arg, 'false');
            return;
        }
        var client = dbapp.client(DBState.access_token);
        client.account(function(status,reply) {
            if (status == 200) {
                caller_event.sender.send(arg, 'true');
            } else {
                caller_event.sender.send(arg, 'false');
            }
        });
    });

    ipc.on("electron-dropbox-do-authorize", function(caller_event, arg) {
        var rt = null;
        dbapp.requesttoken(function(status, request_token){
            rt = request_token;
            var authWindow = new BrowserWindow({width: 600, height: 800, frame: true,
                                                "node-integration": false,
                                                "web-preferences": {
                                                    "web-security": true
                                                }});
            authWindow.loadUrl(request_token.authorize_url);
            var current_timer = null;

            // repeating callback to check to see if the user has finished
            // the auth flow. light-weight compared to calling dbapp.accesstoken
            // over and over.
            var check_authorization = function(cont) {
                if (authWindow) {
                    if (authWindow.getUrl() == "https://www.dropbox.com/1/oauth/authorize_submit") {
                        dbapp.accesstoken(rt, function(status, access_token) {
                            DBState.access_token = access_token;
                            save_config();
                            caller_event.sender.send(arg, status);
                            authWindow.close();
                        })
                    } else {
                        current_timer = setTimeout(check_authorization, 100);
                    }
                }
            };
            check_authorization();
        })
    });
    
    load_config();
    
    return {
        'is_authed': function() { return false; },
        'State':DBState
    }
});

module.exports = ElectronDropbox();
