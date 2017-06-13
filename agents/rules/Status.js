var Rule = require('./Rule').Rule;
var Tools = require('../../zarel/tools');

// Possible observed status modifiers are slp, brn, tox, par

exports.EFFECTS = {"Sleep": "slp", "Poison": "tox", "Paralyse": "par", "Burn": "brn"};


class TryToStatus extends Rule{
  constructor(status){
    super("TryToStatus: " + status);
    this.status = status;
  }

  execute(gameState, options, mySide, forceSwitch){
    if(forceSwitch) return false;
    var oppactive = gameState.sides[1 - mySide.n].active[0];
    for (var move in options) {
      if (options.hasOwnProperty(move)) {
        if(Tools.getMove(options[move].id).status === this.status){
          if(oppactive.status !== this.status){
            return move;
          }
        }
      }
    }

    return false;
  }
}

class TryToHeal extends Rule{
  constructor(threshold){
    super("TryToHeal");
    this.threshold = threshold;
  }

  execute(gameState, options, mySide, forceSwitch){
    if(forceSwitch) return false;
    var active = gameState.sides[mySide.n].active[0];
    if(active.hp > (active.maxhp * this.threshold)) return false;
    var bestOption = null;
    var mostHeal = 0;
    for (var move in options){
      if(options.hasOwnProperty(move)){
        var detail = Tools.getMove(options[move].id);
        if(detail.flags['heal'] === 1){
          var recover
          // calculate healing amount
          if(detail.drain){
            var oppactive = gameState.sides[1 - mySide.n].active[0];
            recover = gameState.getDamage(mySide.active[0], oppactive, options[move].id, false) / 2;
          }else if(detail.heal){
            // It'll recover exactly the heal
            recover = (detail.heal[0] * active.hp) / detail.heal[1];
          }
          if(recover > mostHeal){
            bestOption = move;
            mostHeal = recover;
          }
        }
      }
    }

    return bestOption;
  }
}
exports.TryToStatus = TryToStatus;
exports.TryToHeal = TryToHeal;
