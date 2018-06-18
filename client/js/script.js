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

  var current_x = null;
  var current_y = null;

  var handleOrientation = function(event) {
    current_x = event.alpha;
    current_y = event.beta;

  }
  var orientations = [];
  var origin = null;

  var getOrientation = function(){
    return {"alpha" : current_x, "beta" : current_y};
  }

  //  le combo est généré à partir d'un point de départ
  //  ce premier point n'est pas conservé
  //  on s'en sert pour générer des offsets
  //  seuls les offets seront sauvegardés.
  var comboCreate = function(){
    var combo_container = $('<div class="container combo"></div>');
    var text = $('<div class="combo_text">Définir combinaison</div>');
    var button_set = $('<button class="combo_set">Choisir</button>');
    var button_reset = $('<button class="combo_reset">Recommencer</button>');
    var button_validate = $('<button disabled="disabled" class="combo_validate">Valider</button>');
    var debug = $('<div class="debug"></div>');

    combo_container.append(text);
    combo_container.append(button_set);
    window.addEventListener('deviceorientation', handleOrientation);
    button_set.on("click", function(){
      var orient = getOrientation();
      window.navigator.vibrate(100);
      if( origin === null ){
        origin = orient;
      }
      else{
        //  on transforme orient en offset avant de les stocker
        orient.alpha -= origin.alpha;
        orient.beta -= origin.beta;

        orientations.push(orient);
      }

      if(orientations.length > 2){
        button_validate.prop('disabled', false);
      }

      debug.append('<div>'+parseInt(orient.alpha, 10)+' : '+parseInt(orient.beta, 10)+'</div>');
    });
    button_reset.on("click", function(){
      orientations = [];
      origin = null;
      button_validate.prop('disabled', true);
    });

    button_validate.on("click", function(){

      comboCheck();
      button_validate.prop('disabled', true);
    });

    combo_container.append(button_reset);
    combo_container.append(button_validate);
    combo_container.append(debug);


    $('.container').addClass('hidden');
    $('body').append(combo_container);
  };

  //  redemande à l'utilisateur de valider le combo créé en le refaisant
  var comboCheck = function(){
    var button_set = $('.combo_set');
    var button_reset = $('.combo_reset');
    var button_validate = $('.combo_validate');

    button_set.unbind("click");
    button_reset.unbind("click");
    button_validate.unbind("click");

    var temp_origin = null;
    var temp_orientations = [];

    button_set.on("click", function(){
      var orient = getOrientation();
      window.navigator.vibrate(100);
      if( temp_origin === null ){
        temp_origin = orient;
      }
      else{
        //  on transforme orient en offset avant de les stocker
        orient.alpha -= origin.alpha;
        orient.beta -= origin.beta;

        temp_orientations.push(orient);
      }
    });

    button_reset.on("click", function(){
      temp_orientations = [];
      temp_origin = null;
    });

    button_validate.on("click", function(){
      var offset = 15;

      var invalid = false;

      if(origin.length == temp_origin.length){
        for(var i = 0; i < origin.length; i++){
          if( 
            origin[i]-temp_origin[i] < -offset 
            || origin[i]-temp_origin[i] > offset
            )
          {
              invalid = true;
              break;
          }
        }
      }
      else{
        invalid = true;
      }
      
      if( invalid === false){
        //  sauvegarde du combo
      }
      else{
        temp_orientations = [];
        temp_origin = null;
        //  try again
      }
      

    });

  };



  // open connection
  var connection = new WebSocket('ws://192.168.43.175:1337');
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


    if(json.type === 'signUp'){
      var title = $('<h2>Création d\'un nouvel utilisateur</h2>')
      var passinput = $('<div><input type="password" name="password" placeholder="Mot de passe" /></div>');
      var passinput2 = $('<div><input type="password" name="password_check" placeholder="Répétez votre mot de passe" /></div>');

      var comboButton = $('<div><button>Créer combinaison</button></div>');

      comboButton.on("click", function(){
        comboCreate();
      });

      $(".container").append(title);
      $(".container").append(passinput);
      $(".container").append(passinput2);
      $(".container").append(comboButton);

    }
    else if(json.type === 'signIn'){

    }
    //    lobbies_list est reçu directement après l'authentification
    //    On peut recevoir ce message pour recharger la liste de lobbies (lorsque quelqu'un la modifie)
    else if (json.type === 'lobbies_list') { 
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