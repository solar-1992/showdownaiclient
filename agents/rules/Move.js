var Rule = require('./Rule').Rule;
var Tools = require('../../zarel/tools');

class RandomMove extends Rule{

  constructor(){
    super("Random Non Switch Move");
  }

  execute(gameState, options, mySide, forceSwitch){
    if(forceSwitch) return false;
    return this.fetch_random_key(options);
  }

  fetch_random_key(obj) {
      var temp_key, keys = [];
      for (temp_key in obj) {
          if (obj.hasOwnProperty(temp_key)) {
            if(temp_key.startsWith("move")){
              keys.push(temp_key);
            }
          }
      }
      return keys[Math.floor(Math.random() * keys.length)];
  }
}

class MostDamageMove extends Rule{
  constructor(){
    super("Most Damage");
  }

  execute(gameState, options, mySide, forceSwitch){
    if(forceSwitch) return false;
    // The other guys current active pokemon
    var oppactive = gameState.sides[1 - mySide.n].active[0];
    var maxDamage = 0;
    var bestOption;
    for(var option in options){
      if(option.startsWith('move')){
        var damage = gameState.getDamage(mySide.active[0], oppactive, options[option].id, false);
        if(damage && damage > maxDamage){
          maxDamage = damage;
          bestOption = option;
        }
      }
    }

    return bestOption;
  }
}

// Why do this? because we want to minimise the wastage on high power low pp moves
class MinimalToKO extends Rule{
  constructor(){
    super("MinimalToKO");
  }

  execute(gameState, options, mySide, forceSwitch){
    if(forceSwitch) return false;
    var oppactive = gameState.sides[1 - mySide.n].active[0];
    var minDamage = 9999;
    var bestOption = null;
    for(var option in options){
      if(option.startsWith('move')){
        var damage = gameState.getDamage(mySide.active[0], oppactive, options[option].id, false);
        if(damage && damage > oppactive.hp && damage < minDamage){
          minDamage = damage;
          bestOption = option;
        }
      }
    }

    return bestOption;
  }
}

exports.Random = RandomMove;
exports.MostDamage = MostDamageMove;
exports.MinimalToKO = MinimalToKO;
