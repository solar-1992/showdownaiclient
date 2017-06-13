var Tools = require('../../zarel/tools');

class Rule {
  constructor(name){
    this.name = name;
  }

  execute(gameState, options, mySide, forceSwitch){
    console.log("You should define this function");
    return options[0];
  }
}

// Used as a better place to put simple information looking up. Not an actual rule for calculating
class Query extends Rule{
  execute(gameState, options, mySide, forceSwitch){
    // for (var move in options) {
      // if (options.hasOwnProperty(move)) {
        var active = gameState.sides[mySide.n].active[0];
        // var detail = Tools.getMove(options[move].id);
        // if(detail.flags['heal'] === 1){
          console.log("QUERY");
          console.log(active.types);
        // }
      // }
    // }
    return false;
  }
}

exports.Rule = Rule;
exports.Query = Query;