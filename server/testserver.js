"use strict";
var mysql = require('mysql');

var con = mysql.createConnection({
  host: "127.0.0.1",
  user: "bouboule",
  password: "password",
  database: "quiz"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

/*
**  countdown démarre un timer, et lance l'exécution de func à la fin du timer
**  args sera passé à func lors de l'appel
**  On peut mettre à jour un élément HTML à l'aide de target, représentant une classe CSS
**  time est en ms, doit être multiple de 1000
*/
function countdown(time, func, args, target){
  
  var countdownInterval;
  //if(target !== null){
    //$(target).html(time/1000);
    countdownInterval = setInterval(function() {
      time = time - 1000;
      //$(target).html(time/1000);
      if(time == 0){
        clearInterval(countdownInterval);
        if(args !== null){
          func(args);
        }
        else{
          func();
        }
        
      }
      else{
        //console.log("not up");
      }
      }, 1000);
  }
  /*else{
    setTimeout(func, time);
  }*/


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
//  lobbies
//    users contient les usernames
//    connect contient l'index des users connectés 
//    ready contient l'état ready ou non pour les users de la liste userss
var lobbies = 
[ 
  { name : "Buveurs", users : [], connect : [], ready: [], running : false, roundIndex: 0, answers: [] }, 
  { name : "BLABLA", users : [], connect: [], ready: [], running : false, roundIndex:0, answers: [] } 
];


/*var single_lobby = { name : "Buveurs", users : ["Antaniukas", "Six Roses", "Soiffard"] };
lobbies.push(single_lobby);*/

// list of currently connected clients (users)
var clients = [ ];
//  liste des noms des clients, pour prévenir les doublons
var client_names = [ ];
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





var notify_lobby_answer = function(current_lobby, userIndex, answerId){
  var json_send = { type : "notify_answer", "user" : userIndex, "answerId" : answerId };
  for(var i = 0; i < current_lobby.connect.length; i++){
    clients[current_lobby.connect[i]].sendUTF(  JSON.stringify(json_send)  );
  }
}

var reload_lobby_users = function(current_lobby){
  var json_send = { type : "reload_lobby", lobby : "vomir", users : current_lobby.users };
  for(var i = 0; i < current_lobby.connect.length; i++){
    console.log("reloadlobby");
    console.log(current_lobby.connect[i]);
    clients[current_lobby.connect[i]].sendUTF(  JSON.stringify(json_send)  );
  }

};


var check_lobby_ready = function(current_lobby, lobby_id){
  var total_users = current_lobby.users.length;
  var total_users_ready = 0;

  if(total_users <= 0){
    return null;
  }

  for(var i = 0; i < total_users; i++){
    if(current_lobby.ready[i] === true){
      total_users_ready++;
    }
  }

  if(total_users_ready / total_users >= 0.75){
      start_match(lobby_id);
  }
};

//  Pour toutes les fonctions prenant args en argument :
//  args contient
//    roundIndex  l'index du round courant
//    lobby   l'index du lobby dans lobbies
//    match   l'objet match provenant de l'API

//  Envoie aux clients du lobby l'ordre de jouer le round.
var play_round = function(args){
  var message = { type : "play_round", lobby: args.lobby, round: args.match.rounds[args.roundIndex] };
  lobbies[args.lobby].roundIndex = args.roundIndex;

  for (var i=0; i < lobbies[args.lobby].connect.length; i++) {
    clients[lobbies[args.lobby].connect[i]].sendUTF(JSON.stringify(message));
  }


};

//  send match_end signal to users
//  lorsque le match se termine, plus personne dans le lobby n'est ready.
var end_match = function(args){
  var message = { type : "match_end", name : lobbies[args.lobby].name, lobby : args.lobby, users : lobbies[args.lobby].users };  
  for (var i=0; i < lobbies[args.lobby].connect.length; i++) {
    clients[lobbies[args.lobby].connect[i]].sendUTF( JSON.stringify(message) );
    lobbies[args.lobby].ready[i] = null;
  }

  console.log("--- Match ended ---");
  lobbies[args.lobby].running = false;
};


var start_round = function(args){
  //  start round
  console.log("Nous sommes au round : " + args.roundIndex);

  //  démarrage du round, end_round sera exécuté à la fin du timer
  countdown(15000, end_round, args);
  play_round(args);
};


//  Démarre le round suivant s'il y en a un
//  Termine la partie dans les autres cas
var end_round = function(args){
  // end round
  if(++args.roundIndex < args.match.rounds.length){
    start_round(args);
  }
  else{
    end_match(args);
  }

}


var start_match = function(lobbyId){
  console.log("--- Match started ---");
  lobbies[lobbyId].running = true;


  //  API, request match
  var options = {
    host: "v2.com",
    port: 80,
    path: '/index.php/api',
    method: 'GET'
  };
  var data;

  http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      data = chunk;
      var json;
      try{
        console.log(data);
        json = JSON.parse(data);
      }catch(error){
        console.log("*** error parsing API's JSON ***");
        return null;
      }
      var match = json.data[0];
      var roundCount = match.rounds.length;
      
      //  INIT current_lobby.answers, it never was
      for(var i = 0; i < lobbies[lobbyId].users.length; i++){
        var tab = [];
        for(var j = 0; j < roundCount; j++){
          tab.push(-1);
        }
        lobbies[lobbyId].answers.push(tab);
      }
      console.log(lobbies[lobbyId].answers);

      //  startup match
      var args = { "lobby" : lobbyId, "roundIndex" : 0, "match" : match };
      start_round(args);


      //  Les rounds se déroulent via callbacks.
    });
  }).end();

};

var passHash = function(plainTextPassword){
  var bcrypt = require('bcrypt');
  var salt = "caca";
  var hashedPassword = null;

  bcrypt.genSalt(2, function(err, salt) {
      bcrypt.hash(plainTextPassword, salt, function(err, hash) {
          hashedPassword = hash;
      });
  });
  return hashedPassword;
};







//
//  Server connect
wsServer.on('request', function(request) {


  var unready_lobby_users = function(lobby){
    for (var i=0; i < lobby.connect.length; i++) {
      lobby.ready[i] = null;
    }
  }

  var find_user_index = function(pseudo, lobbyId){
    var tab = lobbies[lobbyId].users;
    var userIndex = tab.indexOf(pseudo);
    return userIndex;
  };

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
          current_lobby.users.push(pseudo);
          current_lobby.connect.push(index);
          
          //current_lobby.connect.push(connection);
          console.log("lobbies update");

          //  load_lobby déplace l'utilisateur dans le lobby
          var message = { type : "load_lobby", name : lobbies[json_message.lobby].name, lobby : json_message.lobby, users : current_lobby.users };  
          connection.sendUTF( JSON.stringify(message) );

          //  On met à jour la liste des utilisateurs qui sont déjà dans le lobby.
          reload_lobby_users(current_lobby, 1);


        }
        else if(json_message.type === 'pseudo'){
          pseudo = json_message.pseudo;

          //  Gestion de la connexion
          //  Si le pseudo n'existe pas en base, on demande de créer un mot de passe ou un combo (combo disponible sur mobile)
          //  S'il existe, on propose l'authentification en mot de passe ou combo
          var sql = "SELECT name from user WHERE name = ?";
          var inserts = [pseudo];
          sql = mysql.format(sql, inserts);

          con.query(sql, function (err, result) {
            if (err) throw err;

            if(result.length > 0){
              //  demande l'authentification
              connection.sendUTF(
                JSON.stringify({ type:'signIn', data: 0 })
              );
            }
            else{
              //  demande la création d'un mot de passe ou combo
              connection.sendUTF(
                JSON.stringify({ type:'signUp', data: 0 })
              );
            }
          });


          /*connection.sendUTF(
            JSON.stringify({ type:'lobbies_list', data: lobbies })
          );*/

          
        }
        //  Le user créé son mot de passe
        else if(json_message.type === 'createPassword'){

          var hashedPassword = passHash(json_message.password);
          console.log(hashedPassword);

          var sql = "INSERT INTO user (name, password) VALUES (?, ?)";
          var inserts = [pseudo, hashedPassword];
          sql = mysql.format(sql, inserts);

          con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("user inserted");
          });


          //pseudo = null;
          //  user must provide a combo if he can
          //  if he can't he goes straight to signIn
          if(json_message.canCombo == true){
            connection.sendUTF(
              JSON.stringify({ type:'askCombo', data: 0 })
            );
          }
          else{
            connection.sendUTF(
              JSON.stringify({ type:'signIn', data: 0 })
            );
          }
          
        }
        else if(json_message.type === 'createCombo'){


          //pseudo = null;
          //  user must reconnect
        }
        else if(json_message.type === 'password'){
          console.log("password");



          //  Si authorized, on envoie la liste des lobbies
          connection.sendUTF(
            JSON.stringify({ type:'lobbies_list', data: lobbies }));
        }
        else if(json_message.type === 'combo'){


          //  Si authorized, on envoie la liste des lobbies
          connection.sendUTF(
            JSON.stringify({ type:'lobbies_list', data: lobbies }));
        }
        else if(json_message.type === 'lobby_chat_message'){
          console.log(lobbies);
          
          //  get current time for message send
          var dateTime = require('node-datetime');
          var dt = dateTime.create();
          var formatted = dt.format('H:M:S');
          
          //  Broadcast message for lobby only.
          var json_send = JSON.stringify({ type:'lobby_chat_message', message: json_message.message, user : pseudo, time: formatted });
          var current_lobby = lobbies[json_message.lobby];

          //console.log(json_message);
          for (var i=0; i < current_lobby.connect.length; i++) {
            clients[current_lobby.connect[i]].sendUTF(json_send);
          }
        }

        else if(json_message.type === 'lobby_user_ready'){
          //  Un user est ready, on change son état
          //  Si le % de personnes ready dépasse 75%, on lance la partie pour tous les joueurs du lobby.
          var current_lobby = lobbies[parseInt(json_message.lobby)];
          var total_users = current_lobby.users.length;

          for(var i = 0; i < total_users; i++){
            if(json_message.user == current_lobby.users[i]){
              current_lobby.ready[i] = true;
            }
          }
          check_lobby_ready(current_lobby, parseInt(json_message.lobby));


        }

        //  Le joueur répond à une question
        else if(json_message.type === 'answer'){
          console.log(json_message);
          var current_lobby = lobbies[json_message.lobby];
          console.log(current_lobby);
          if(current_lobby.running !== false){
            var userIndex = find_user_index(json_message.user, json_message.lobby);



            if(userIndex != -1 
              && typeof(current_lobby.answers[userIndex]) != 'undefined' 
              && typeof(current_lobby.answers[userIndex][current_lobby.roundIndex]) != 'undefined' 

            ){
              current_lobby.answers[userIndex][current_lobby.roundIndex] = json_message.answer;

              //  On notifie tous les joueurs du lobby que quelqu'un a joué.
              notify_lobby_answer(current_lobby, userIndex, json_message.answer);
              console.log(current_lobby.answers);
            }
            else{
              console.log("déjà répondu ???");
            }
          }
          else{
            console.log("someone tried to play in a non running game.");
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
    //  On doit aussi supprimer le connect correspondant au user.
    //  On doit aussi supprimer le ready correspondant au user.
    //  S'il a quitté un lobby, on remet les (autres) clients du lobby à jour.
    //  S'il a quitté un lobby avec un jeu en cours, on remet les users du lobby unready
    //  S'il a quitté un lobby, on revérifie si les clients présents sont ready
    for(var i = 0; i < lobbies.length; i++){
      var userIndex = find_user_index(pseudo, i);
      if( userIndex !== -1){
        lobbies[i].users.splice(userIndex, 1);
        lobbies[i].connect.splice(userIndex, 1);
        lobbies[i].ready.splice(userIndex, 1);
        unready_lobby_users(lobbies[i]);
        reload_lobby_users(lobbies[i], 1);
        check_lobby_ready(lobbies[i], i);
        

      }
    }
  });
});