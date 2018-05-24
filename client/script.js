var json;
$(function () {
  "use strict";
  // for better performance - to avoid searching in DOM
  var main = $('.container');
  var input = $(' #pseudo');

  var pseudo = "";
  var current_lobby = "";


  //  Appuyez sur entrée 
  input.on("keydown", function(e){
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }
      pseudo = msg;
      var message = { "type" : "pseudo", "pseudo" : msg };
      connection.send(JSON.stringify(message));

    }
  });



  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  // if browser doesn't support WebSocket, just show
  // some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>',
      { text:'Sorry, but your browser doesn\'t support WebSocket.'}
    ));
    input.hide();
    $('span').hide();
    return;
  }
  //  génère la liste d'utilisateurs pour un lobby
  var user_list_html = function(lobby){
    var spanusers = $("<div>connected users :</div>");
      for(var j = 0; j < lobby.users.length; j++){
        var spanuser = $("<span></span>");
        spanuser.text(lobby.users[j]);
        spanusers.append(spanuser);
      }
    return spanusers;
  }


  // open connection
  var connection = new WebSocket('ws://127.0.0.1:1337');
  connection.onopen = function () {
    // first we want users to enter their names
    console.log("opened");
  };
  connection.onmessage = function (message) {
    // try to parse JSON message. Because we know that the server
    // always returns JSON this should work without any problem but
    // we should make sure that the massage is not chunked or
    // otherwise damaged.
    try {
      json = JSON.parse(message.data);
    } catch (e) {
      console.log('Invalid JSON: ', message.data);
      return;
    }

    //console.log("PRESS X to JSON");

    //    lobbies_list est reçu directement à la connexion
    //    On peut recevoir ce message pour recharger la liste de lobbies (lorsque quelqu'un la modifie)
    if (json.type === 'lobbies_list') { 
      console.log(json);
      main.html('');

      var lobbyCount = json.data.length;
      for(var i = 0; i < lobbyCount; i++){
        var lobby = json.data[i];

        var container = $('<div class="lobby container"></div>')
        var header = $("<div>"+ lobby.name +"</div>");
        var content = $("<div></div>");
        content.addClass("lobby");

        var uluser = $("<ul></ul>");
        for(var j = 0; j < lobby.users.length; j++){
          var liuser = $("<li></li>");
          liuser.text(lobby.users[j]);

          uluser.append(liuser);
        }

        var join = $('<button data-join="'+ i +'">Join lobby</button>');

        content.append(uluser);
        content.append(join);

        container.append(header);
        container.append(content);

        main.append(container);

        

      }
      $("button").on("click", function(){
        var message = { "type" : "lobby_join", "lobby" : $(this).data("join"), "user" : pseudo };

        current_lobby = parseInt($(this).data("join"));
        connection.send(JSON.stringify(message));
      });
      

    }
    //  load_lobby est reçu lorsqu'un lobby a été choisi
    //  On peut alors afficher la salle d'attente
    else if (json.type  === 'load_lobby'){
      console.log("loading lobby");
      main.html('');

      var lobby = json;

      //  print users
      var container = $('<div class="chat_container"></div>');
      var userlist = $('<div class="userlist"></div>');
      var content = $('<div class="chat_window"></div>');
      var textinput = $('<input type="text" class="lobby_chat_input" placeholder="Ecrivez un message, Entrée pour valider"/>');
      var readybutton = $('<button class="lobby_button_ready">Je suis READY</button>');
      content.addClass("lobby");

      var spanusers = user_list_html(lobby);
      userlist.append(spanusers);

      container.append(userlist);
      container.append(content);
      container.append(textinput);
      container.append(readybutton);

      main.append(container);

      $(".lobby_chat_input").on("keydown", function(e){
        if (e.keyCode === 13) {
          var message = { "type" : "lobby_chat_message", "message" : $(".lobby_chat_input").val(), "lobby" : current_lobby };
          connection.send(JSON.stringify(message));
          $(".lobby_chat_input").val('');
        }
      });

      $(".lobby_button_ready").on("click", function(){
        var message = { "type" : "lobby_user_ready", "lobby": current_lobby, "user" : pseudo };
        connection.send(JSON.stringify(message));

        console.log("I'm ready");
        $(".lobby_button_ready").css("color", "green");
        $(".lobby_button_ready").attr("disabled", "disabled");

      });


    }
    //  rechargement utilisateurs d'un seul lobby
    else if(json.type === "reload_lobby"){
      console.log("reload_lobby");
      var lobby = json;

      var userhtml = user_list_html(lobby);
      $(".userlist").html(userhtml);
    }

    else if(json.type === 'lobby_chat_message'){
      var div = $('<div class="chat_message"></div>');
      div.text("("+ json.time +")"+json.user + " : " +json.message);
      $('.chat_window').append(div);
    }

  }

  

});