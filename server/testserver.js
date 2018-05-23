"use strict";
// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';
// Port where we'll run the websocket server
var webSocketsServerPort = 1337;
// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');
/**
 * Global variables
 */
// lobbies
var lobbies = 
[ 
  { name : "Buveurs", users : [], connect : [] }, 
  { name : "BLABLA", users : [], connect: [] } 
];

/*var single_lobby = { name : "Buveurs", users : ["Antaniukas", "Six Roses", "Soiffard"] };
lobbies.push(single_lobby);*/

// list of currently connected clients (users)
var clients = [ ];
/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
  // Not important for us. We're writing WebSocket server,
  // not HTTP server
});
server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " Server is listening on port "
      + webSocketsServerPort);
});
/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
  // WebSocket server is tied to a HTTP server. WebSocket
  // request is just an enhanced HTTP request. For more info 
  // http://tools.ietf.org/html/rfc6455#page-6
  httpServer: server
});


//  Triggered on connect
wsServer.on('request', function(request) {
  var pseudo = "";


  console.log((new Date()) + ' Connection from origin '
      + request.origin + '.');
  // accept connection - you should check 'request.origin' to
  // make sure that client is connecting from your website
  // (http://en.wikipedia.org/wiki/Same_origin_policy)
  var connection = request.accept(null, request.origin); 
  // we need to know client index to remove them on 'close' event
  var index = clients.push(connection) - 1;
  var userName = false;
  var userColor = false;
  console.log((new Date()) + ' Connection accepted.');
  
  //  message
  connection.on('message', function(message) {
    console.log(message);
    if (message.type === 'utf8') { // accept only text
        var json_message = JSON.parse(message.utf8Data);

        if(json_message.type === 'lobby_join'){
          //  Un user veut rejoindre un lobby
          var current_lobby = lobbies[parseInt(json_message.lobby)];
          current_lobby.users.push(json_message.user);
          current_lobby.connect.push( index );
          

          //  STOCKER LES connects par lobby...
          //current_lobby.connect.push(connection);
          console.log("lobbies update");

          var message = { type : "load_lobby", lobby : json_message.lobby, users : current_lobby.users };  
          connection.sendUTF( JSON.stringify(message) );
        }
        else if(json_message.type === 'pseudo'){
          pseudo = json_message.pseudo;

          connection.sendUTF(
            JSON.stringify({ type:'lobbies_list', data: lobbies }));
        }
        else if(json_message.type === 'lobby_chat_message'){
          //  Broadcast message for lobby only.
          var json_send = JSON.stringify({ type:'lobby_chat_message', message: json_message.message, user : pseudo });
          var current_lobby = lobbies[json_message.lobby];

          console.log(json_message);

          for (var i=0; i < current_lobby.connect.length; i++) {
            clients[current_lobby.connect[i]].sendUTF(json_send);
          }
        }
    }
  });



  connection.on('close', function(connection) {
    if(pseudo === ''){
      pseudo = "anonyme";
    }
    console.log(pseudo + " s'est déconnecté...");

    //  On supprime le user s'il est connecté dans un des lobby.
    for(var i = 0; i < lobbies.length; i++){
      var tab = lobbies[i].users;
      var truc = tab.indexOf(pseudo);
      if( truc !== -1){
        lobbies[i].users.splice(truc, 1);
      } 
    }
  });
});