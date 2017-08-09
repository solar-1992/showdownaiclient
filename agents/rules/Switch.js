var Rule = require('./Rule').Rule;
var Tools = require('../../zarel/tools');
var TypeChart = require('../../zarel/data/typechart').BattleTypeChart;


// Switches if another pokemon in our party is resistant to other pokemon
// and has a move that is super effective against them that deals damage
class SwitchToTypeAdvantage extends Rule{
  constructor(){
    super("SwitchToTypeAdvantage");
  }

  execute(gameState, options, mySide, forceSwitch){
    if(forceSwitch) return false;
    // Do we already have a type advantage?
    var active = gameState.sides[mySide.n].active[0];
    var oppactive = gameState.sides[1 - mySide.n].active[0];
    // console.log("SwitchToTypeAdvantage Am: ", active.name);
    // console.log("SwitchToTypeAdvantage Against: ", oppactive.name);

    // Tools.getImmunity(source, target) returns false if target is immune, true if otherwise
    // Tools.getEffectiveness(source, target) returns 1 for super-effective, -1 for resist 0 for normal
    // source can be a move or the type itself. Target can be the pokemon or the array of types

    // We are immune to their type - good to stay
    if(!Tools.getImmunity(oppactive, active)) return false;
    // console.log("SwitchToTypeAdvantage Wasn't Immune");

    // We are super effective against them - also good to stay
    if(Tools.getEffectiveness(active, oppactive) >= 1) return false;
    // console.log("SwitchToTypeAdvantage Wasn't super effective");

    // Search if any of our pokemon are better than now!
    // need to calculate how effective we are staying - otherwise it will always switch to something

    var mostEffective = this.calcAdvantage(active, oppactive);
    var bestOption = null;
    for(var i = 0; i < mySide.pokemon.length; i++){
      var poke = mySide.pokemon[i];
      if(poke.position == 0) continue;
      if(!Tools.getImmunity(oppactive, poke)) return option;
      var advantage = this.calcAdvantage(poke, oppactive);
      // console.log("SwitchToTypeAdvantage Comparing: ", poke.name, " Effectiveness: ", advantage);
      if(advantage >= 1 && advantage > mostEffective){
        mostEffective = advantage;
        bestOption = "switch " + poke.position;
      }
    }
    return bestOption;
  }

  calcAdvantage(poke, oppactive){
    var advantage = 0;
    for(var mtype of poke.types){
      advantage += Tools.getEffectiveness(mtype, oppactive);
    }
    return advantage * poke.hp;
  }
}

exports.TypeAdvantage = SwitchToTypeAdvantage;
