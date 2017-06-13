var Rule = require('./Rule').Rule;

class RandomForceSwitch extends Rule{

  constructor(){
    super("RandomForceSwitch");
  }

  execute(gameState, options, mySide, forceSwitch){
    if(!forceSwitch) return false;
    return this.fetch_random_key(options);
  }

  fetch_random_key(obj) {
      var temp_key, keys = [];
      for (temp_key in obj) {
          if (obj.hasOwnProperty(temp_key)) {
              keys.push(temp_key);
          }
      }
      return keys[Math.floor(Math.random() * keys.length)];
  }
}

class MaxHPForceSwitch extends Rule{

  constructor(){
    super("MaxHPForceSwitch");
  }

  execute(gameState, options, mySide, forceSwitch){
    if(!forceSwitch) return false;
    var pokemon = mySide.pokemon;
    var highestHP = 0;
    var bestMove = "";
    for (var i = 0; i < pokemon.length; i++) {
      if(pokemon[i].hp > highestHP){
        highestHP = pokemon[i].hp;
        bestMove = "switch " + pokemon[i].position;
      }
    }
    return bestMove;
  }
}

exports.Random = RandomForceSwitch;
exports.MaxHP = MaxHPForceSwitch;
