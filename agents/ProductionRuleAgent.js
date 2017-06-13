'use strict';

var Pokemon = require('../zarel/battle-engine').BattlePokemon;
var BattleSide = require('../zarel/battle-engine').BattleSide;
var ForceSwitch = require('./rules/ForceSwitch');
var Move = require('./rules/Move');
var Status = require('./rules/Status');
var Rule = require('./rules/Rule');
var Switch = require('./rules/Switch');

class ProductionRuleAgent {

    constructor(){
      this.name = "PRA";
      this.rules = [];
      this.rules.push(new Rule.Query());
      // this.rules.push(new Switch.TypeAdvantage());
      this.rules.push(new Status.TryToHeal(0.75));
      this.rules.push(new Status.TryToStatus(Status.EFFECTS['Sleep']));
      this.rules.push(new Status.TryToStatus(Status.EFFECTS['Burn']));
      this.rules.push(new Status.TryToStatus(Status.EFFECTS['Poison']));
      this.rules.push(new Status.TryToStatus(Status.EFFECTS['Paralyse']));
      this.rules.push(new ForceSwitch.MaxHP());
      this.rules.push(new Move.MinimalToKO());
      this.rules.push(new Move.MostDamage());
    }

    decide(gameState, options, mySide, forceSwitch){
        for(var i = 0; i < this.rules.length; i++){
          var action = this.rules[i].execute(gameState, options, mySide, forceSwitch);
          console.log("Rule : " + this.rules[i].name + " said: " + action)
          if(action) return action;
        }
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

    assumePokemon(pname, plevel, pgender, side) {
        var nSet = {
            species: pname,
            name: pname,
            level: plevel,
            gender: pgender,
            evs: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            nature: "Hardy",
            ability: "Honey Gather"
        };
        // If the species only has one ability, then the pokemon's ability can only have the one ability.
        // Barring zoroark, skill swap, and role play nonsense.
        // This will be pretty much how we digest abilities as well
        if (Object.keys(Tools.getTemplate(pname).abilities).length == 1) {
            nSet.ability = Tools.getTemplate(pname).abilities['0'];
        }
        var basePokemon = new Pokemon(nSet, side);

        return basePokemon;
    }

    digest(line) {
    }

}

class TestPRA extends ProductionRuleAgent{
  constructor(){
    super();
    this.name = "PRAOld";
    this.rules = [];
    // this.rules.push(new Move.SendToSleep());
    this.rules.push(new ForceSwitch.MaxHP());
    this.rules.push(new Move.MinimalToKO);
    this.rules.push(new Move.MostDamage());
  }
}

exports.Agent = ProductionRuleAgent;
exports.OldAgent = TestPRA;
