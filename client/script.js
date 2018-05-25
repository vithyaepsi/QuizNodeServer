var json;
$(function () {
  "use strict";
  // for better performance - to avoid searching in DOM
  var main = $('.container');
  var input = $(' #pseudo');
  //var lobbyId = null;

  var pseudo = "";
  var current_lobby = "";
  input.focus();


  //  Entrez votre pseudo pour commencer 
  input.on("keydown", function(e){
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }
      pseudo = msg;
      var message = { "type" : "pseudo", "pseudo" : msg };
      connection.send(JSON.stringify(message));

      main.html('');
      $(window).focus();

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

  var load_lobby = function(json){
    console.log("loading lobby");
    main.html('');

    var lobby = json;
    console.log(lobby);
    //  remember lobbyID
    //lobbyId = json.lobby;

    var container = $('<div class="chat_container"></div>');
    var header = $('<div>Lobby : '+ lobby.name +'</div>');
    var userlist = $('<div class="userlist"></div>');
    var content = $('<div class="chat_window"></div>');
    var textinput = $('<input type="text" class="lobby_chat_input" placeholder="Ecrivez un message, Entrée pour valider"/>');
    var readybutton = $('<button class="lobby_button_ready">Je suis READY</button>');

    var game_window = $('<div class="game_window">En attente du lancement de la partie</div>');
    content.addClass("lobby");

    var spanusers = user_list_html(lobby);
    userlist.append(spanusers);

    container.append(header);
    container.append(userlist);
    container.append(content);
    container.append(textinput);
    container.append(readybutton);

    main.append(container);
    main.append(game_window);

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



  // open connection
  var connection = new WebSocket('ws://127.0.0.1:1337');
  connection.onopen = function () {
    // first we want users to enter their names
    console.log("opened");
  };
  connection.onmessage = function (message) {

      var send_answer = function(lobbyId, answerId, pseudo){
        var message = { "type" : "answer", "lobby" : lobbyId, "answer": answerId, "user" : pseudo };
        console.log(message);

        connection.send(JSON.stringify(message));
      };


    // try to parse JSON message. Because we know that the server
    // always returns JSON this should work without any problem but
    // we should make sure that the massage is not chunked or
    // otherwise damaged.
    try {
      json = JSON.parse(message.data);
    } catch (e) {
      console.log('Invalid JSON: please kindly fuck off ', message.data);
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

        var container = $('<div class="lobby_container"></div>')
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
        if( lobby.running !== false ){
          join.attr("disabled", "disabled");
          join.text("Game running");
        }

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
      load_lobby(json);


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

      $(".chat_window").scrollTop($(".chat_window")[0].scrollHeight);
    }

    else if(json.type === "play_round"){
      $(".container>div").addClass("game_active");
      console.log(json);

      var game_window = $(".game_window");
      game_window.html('');

      var div_header = $('<div class="header_container"></div>');
      var div_question = $('<div class="question_container"></div>');
      var div_answers = $('<div class="answers_container"></div>');

      var question_header = $('<h3 class="question_header"></h3>');
      question_header.text(json.round.question.question_type.text);
      div_header.append(question_header);

      //  question_type 2 affiche une image
      if( json.round.question.question_type.id == 2 ){
        var img = $("<img></img>");
        img.attr("src", "http://v2.com/img/"+json.round.question.image);

        div_question.append(img);


      }
      else{
        console.log("pas d'image pour cette question !");
      }

      var answers = json.round.answers;
      var div_answers_container = $('<div class="answers_sub_container"></div>');
      div_answers.append(div_answers_container);

      for(var i = 0; i < answers.length; i++){
        var div_answer = $('<div data-id="'+i+'" class="answer"></div>');
        var div_answer_text = $('<div class="text"></div>');
        var div_answer_notifier = $('<div class="notifier"></div>');

        var aaa = parseInt(json.lobby);

        //  On click
        div_answer.on("click", function(){
          send_answer(aaa, $(this).data("id"), pseudo);


          //  kill the click event on all answers.
          $('.game_window .answer').unbind("click");
        });

        div_answer_text.text(answers[i].text);

        div_answer.append(div_answer_text);
        div_answer.append(div_answer_notifier);

        div_answers_container.append(div_answer);
      }

      game_window.append(div_header);
      game_window.append(div_question);
      game_window.append(div_answers);

    }

    else if(json.type === "match_end"){
      $(".container>div").removeClass("game_active");

      load_lobby(json);
    }

    else if(json.type === "notify_answer"){
      console.log("il semblerait que "+json.user + " ait répondu à la question en cours");


    }

  }

  

});