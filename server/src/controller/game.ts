import { Game, HeroKind, Region} from '../model';

export function game(socket, model: Game) {

  socket.on("moveRequest", function (tile, callback) {
    console.log("Recieved moveRequest")
    let canMove: boolean = false
    /* currently does not work 
    var heroId = socket.conn.id
    let hero = model.getHero(heroId);
    console.log(hero)
    for(var id in hero.getRegion().getAdjRegionsIds()){
      if(model.getRegions()[id] === tile){
        console.log("Can move from tile: ", tile.id, " to tile: ", id)
      }
  }
    /*
    
    // any logic for movement here

    if (canMove) {
      socket.broadcast.emit("updateHeroMove", heroId);
    } else {
      // could emit event for handling failure move case here.
    }
    callback();
   */
  });

  socket.on("pickupFarmer", function(heroId, callback){
    let success = false;
    heroId = socket.conn.id;
    let hero = model.getHero(heroId);
    if(hero !== undefined){
      success = hero.pickupFarmer();
    }

    if(success){
      socket.broadcast.emit("updateFarmer");
      callback();
    }
  });
    
  socket.on('bind hero', function (heroType, callback) {
    let success = false;
    let id = socket.conn.id;

    if (heroType === "archer")
      success = model.bindHero(id, HeroKind.Archer);

    else if (heroType === "warrior")
      success = model.bindHero(id, HeroKind.Warrior);
    else if (heroType === "mage")
      success = model.bindHero(id, HeroKind.Mage);
    else if (heroType === "dwarf")
      success = model.bindHero(id, HeroKind.Dwarf);

    if (success) {
      let remaining = model.getAvailableHeros();
      let heros = {
        taken: ["archer", "warrior", "mage", "dwarf"].filter(f => !remaining.toString().includes(f)),
        remaining: remaining
      } 
      socket.broadcast.emit("updateHeroList", heros)
      callback(heros);
    }

  });

  socket.on('disconnect', function () {
    console.log('user disconnected', socket.conn.id, ' in game.');
    // model.removePlayer(socket.conn.id);
  });


  /*
   * CHAT RELATED
   */
  socket.on("send message", function (sent_msg, callback) {
    console.log(socket.conn.id, "said: ", sent_msg)
    let raw_sent_msg = sent_msg
    let datestamp = getCurrentDate()
    sent_msg = "[ " + datestamp + " ]: " + sent_msg;
    model.pushToLog({ author: socket.conn.id, datestamp: datestamp, content: raw_sent_msg })
    socket.broadcast.emit("update messages", sent_msg);
    callback(sent_msg);
  });

  socket.on('removeListener', function (object) {
    console.log('removing ', object)
    socket.broadcast.emit('removeObjListener',object)
  })

  socket.on("getChatLog", function (callback) {
    callback(model.getChatLog())
  })

  socket.on('playerReady', function () {
    model.readyplayers += 1;
    console.log('ready players: ', model.readyplayers)
    socket.broadcast.emit('recieveDesiredPlayerCount', model.getNumOfDesiredPlayers())
  })

  socket.on('getReadyPlayers', function() {
    socket.broadcast.emit('sendReadyPlayers', model.readyplayers)
    socket.emit('sendReadyPlayers', model.readyplayers)
  })

  socket.on('getDesiredPlayerCount', function() {
    socket.broadcast.emit('recieveDesiredPlayerCount', model.getNumOfDesiredPlayers())
    socket.emit('recieveDesiredPlayerCount', model.getNumOfDesiredPlayers())
  })

  socket.on("dropGold", function (callback) {
    // TODO:
    callback()
  })

  // Collaborative decision making
  socket.on('collabDecisionAccept', function () {
    model.numAccepts += 1;
    console.log('number of players accepted decision: ', model.numAccepts)
    // Tell the client that accepted to update their status
    socket.emit('sendDecisionAccepted', model.numAccepts)
  })

  // socket.on('getReadyPlayers', function() {
  //   socket.broadcast.emit('sendReadyPlayers', model.readyplayers)
  //   socket.emit('sendReadyPlayers', model.readyplayers)
  // })

  function getCurrentDate() {
    var currentDate = new Date();
    var day = (currentDate.getDate() < 10 ? '0' : '') + currentDate.getDate();
    var month = ((currentDate.getMonth() + 1) < 10 ? '0' : '') + (currentDate.getMonth() + 1);
    var year = currentDate.getFullYear();
    var hour = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
    var minute = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
    var second = (currentDate.getSeconds() < 10 ? '0' : '') + currentDate.getSeconds();

    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
  }


}

