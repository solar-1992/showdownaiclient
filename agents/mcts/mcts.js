'use strict'

var Pokemon = require('../../zarel/battle-engine').BattlePokemon;
var ProductionRuleAgent = require('../ProductionRuleAgent').Agent;


class MCTS{
  constructor(policy = null){
    this.policy = (policy) ? policy : new ProductionRuleAgent(true);
    this.treeDepthLimit = 10;
    this.rolloutDepthLimit = 5;
    this.timeBudget = 5 * 1000;
    this.name = "MCTS";
    this.skipRolloutThreshold = 0.15;
    this.assumptions = {};
    this.logLength = 0;
  }

  handleAssumptions(gameState, n){
    const pokemon = gameState.sides[1 - n].active[0];
    const lastMove = pokemon.lastMove;

    const logLength = gameState.log.length;
    if(logLength > this.logLength){
      this.logLength = logLength;
    }else if(logLength < this.logLength){
      this.logLength = 0;
      this.assumptions = {};
      //console.log("Resetting Assumptions");
    }

    if(!this.assumptions[pokemon.name]){
      this.assumptions[pokemon.name] = [];
      //console.log("New Pokemon", pokemon.name);
    }

    if(lastMove == "") {
      //console.log("Didn't make a move");
      return;
    }

    if(this.assumptions[pokemon.name].indexOf(lastMove) == -1){
      this.assumptions[pokemon.name].push(lastMove);
      //console.log("Adding Move", lastMove);
    }
  }

  decide(gameState, options, mySide, forceSwitch){
    this.handleAssumptions(gameState, mySide.n);
    console.log("SWITCH", forceSwitch);
    console.log("My HP", mySide.active[0].hp);
    console.log("Their HP", gameState.sides[1 - mySide.n].active[0].hp);
    if(forceSwitch) {
      var move = this.policy.decide(gameState, options, mySide, forceSwitch);
      console.log("MOVE", move);
      return move;
    }

    var startTime = new Date().getTime();
    // console.log("Root Options", options);
    var nState = gameState.copy();
    nState.p1.currentRequest = 'move';
    nState.p2.currentRequest = 'move';
    nState.isTerminal = false;
    nState.me = mySide.n;

    function battleSend(type, data){
      // Knocked other guy out
      const otherSide = this.sides[1 - this.me];
      const mySide = this.sides[this.me];
      if(otherSide.active[0].hp == 0) {
          this.isTerminal = true;
      }else if(mySide.active[0].hp == 0){
        this.isTerminal = true;
      }else if(mySide.currentRequest == 'switch'){
        this.isTerminal = true;
      }else if(otherSide.currentRequest == 'switch'){
        this.isTerminal = true;
      }
    }

    nState.send = battleSend;

    nState.heuristic = function(){
      const mySide = this.sides[this.me];
      const theirSide = this.sides[1 - this.me];
      var myHP = 0;
      var myMaxHP = 0;
      for(var i = 0; i < mySide.pokemon.length; i++){
        myHP += mySide.pokemon[i].hp;
        myMaxHP += mySide.pokemon[i].maxhp;
      }

      var myHpFraction = myHP / myMaxHP;
      var theirHpFraction = theirSide.active[0].hp / theirSide.active[0].maxhp;

      return (myHpFraction - (theirHpFraction));
    };



    var root = new Node();

    var iterations = 0;
    while((new Date()).getTime() - startTime <= this.timeBudget){
      var iterState = nState.copy();
      //console.log("QUERY BEFORE", iterState.sides[1 - mySide.n].active[0].hp);
      // Fudge the other pokemon
      iterState = this.fudgeState(iterState, mySide);
      //console.log("QUERY AFTER", iterState.sides[1 - mySide.n].active[0].hp);

      //console.log("ITERATION: ", iterations);
      var current = this.select(root, iterState, mySide);
      //console.log("SELECT returned: ", current);
      var score = this.rollout(current, iterState);
      current.backup(score);
      iterations++;
    }
    var move = root.getBestNode().moveToThisState;
    console.log("CHOSE", move);
    return move;
  }

  fudgeState(iterState, mySide){
    const side  = iterState.sides[1 - mySide.n];
    const pokemon = side.active[0];
    const pname = pokemon.name;
    const pgender = pokemon.gender;
    const plevel = pokemon.level;
    const hp = pokemon.hp;

    side.active[0] = this.assumePokemon(pname, plevel, pgender, side);
    side.active[0].hp = hp;
    return iterState;
  }

  select(root, iterState, mySide){
    var current = root;
    while(!iterState.isTerminal && current.depth < this.treeDepthLimit){
      // Is current fullyExpanded?
      var options = this.getOptions(iterState, mySide.n);
      if(current.isFullyExpanded(options)){
        current = current.getUCTNode(iterState, options);
        iterState = this.forwardState(iterState, current.moveToThisState);
      }else{
        current = this.expand(current, iterState, mySide);
        return current;
      }
    }
    return current;
  }

  policyDecide(iterState, side){
    if(iterState.me == side){
      const lockedMove = iterState.sides[side].active[0].getLockedMove();
      if(lockedMove != false){
        return "move " + lockedMove;
      }
    }
    var option = this.policy.decide(
      iterState,
      this.getOptions(iterState, side),
      iterState.sides[side],
      false
    );
    if(option) return option;
    console.log("No Move Chosen");
    return "";
  }

  forwardState(iterState, firstChoice = null, secondChoice = null){
    var firstPlayer = (iterState.me == 0) ? 'p1' : 'p2';
    var firstIndex = iterState.me;
    var secondPlayer = (iterState.me == 0) ? 'p2' : 'p1';
    var secondIndex = 1 - iterState.me;

    iterState.choose(firstPlayer, (firstChoice) ? firstChoice : this.policyDecide(iterState, firstIndex));
    iterState.choose(secondPlayer, (secondChoice) ? secondChoice : this.policyDecide(iterState, secondIndex));

    return iterState;
  }

  getOptions(state, player) {
      return Tools.parseRequestData(state.sides[player].getRequestData());
  }

// Use policy on both sides
  rollout(current, iterState){
    var score = iterState.heuristic();
    if(score > this.skipRolloutThreshold || score < -this.skipRolloutThreshold){
       return score;
    }
    var count = 0;
    while(!iterState.isTerminal && count < this.rolloutDepthLimit){
      iterState = this.forwardState(iterState);
      count++;
    }
    return iterState.heuristic();
  }

  expand(current, iterState, mySide){
    return this.selectActionForExpand(iterState, current, mySide);
  }

  selectActionForExpand(iterState, parent, mySide){
    var options = this.getOptions(iterState, mySide.n);

    var canSwap = parent.depth == 0;

    for (var move in options) {
      if (options.hasOwnProperty(move) && (canSwap || move.startsWith("m"))) {
        if(!parent.childMoves.includes(move)){
          var expandedNode = new Node(parent, move);
          iterState = this.forwardState(iterState, move);
          parent.children.push(expandedNode);
          parent.childMoves.push(move);
          return expandedNode;
        }
      }
    }
    return parent;
  }

  assumePokemon(pname, plevel, pgender, side) {
    if(!this.assumptions[pname]){
      console.log("ASSUME for first time:", pname, plevel, pgender, side.n);
    }
      var template = Tools.getTemplate(pname);
      var nSet = {
          species: pname,
          name: pname,
          level: plevel,
          gender: pgender,
          evs: {
              hp: 85,
              atk: 85,
              def: 85,
              spa: 85,
              spd: 85,
              spe: 85
          },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          nature: "Hardy",
          moves: [],
      };

      if(this.assumptions[pname]){
        // We can use some moves
        for(var moveid in this.assumptions[pname]){
          nSet.moves.push(toId(this.assumptions[pname][moveid]));
        }
      }

      // Complete the list
      while(nSet.moves.length < 4){
          var choice = this.randomListItem(template.randomBattleMoves);
          if(nSet.moves.indexOf(choice) == -1){
            nSet.moves.push(choice);
          }
      }

      // console.log("Chosen moves", pname, nSet.moves);

      var basePokemon = new Pokemon(nSet, side);
      // If the species only has one ability, then the pokemon's ability can only have the one ability.
      // Barring zoroark, skill swap, and role play nonsense.
      // This will be pretty much how we digest abilities as well
      if (Object.keys(basePokemon.template.abilities).length == 1) {
          basePokemon.baseAbility = toId(basePokemon.template.abilities['0']);
          basePokemon.ability = basePokemon.baseAbility;
          basePokemon.abilityData = { id: basePokemon.ability };
      }
      //this.assumptions[pname] = basePokemon;
      return basePokemon;
  }

  digest(line) {
  }

  randomListItem(list){
    return list[Math.floor((Math.random() * list.length))];
  }
}

class Node{
  constructor(parent = null, moveToThisState = ""){
    this.depth = (parent == null) ? 0 : parent.depth + 1;
    this.parent = parent;
    this.moveToThisState = moveToThisState;
    this.children = [];
    this.childMoves = [];
    this.visits = 0;
    this.score = 0;
    this.expConstant = Math.sqrt(2.0);
  }

  getUCTValue(){
    if(this.parent == null){
      return 0;
    }
    return (this.score / this.visits) + (this.expConstant * Math.sqrt(Math.log(this.parent.visits) / this.visits));
  }

  getUCTNode(gameState, options){
    var bestScore = this.children[0].getUCTValue();
    var bestNode = this.children[0];

    for (var i = 1; i < this.children.length; i++) {
      if(!options[this.children[i].moveToThisState]){
        continue;
      }
      var score = this.children[i].getUCTValue();
      if(score > bestScore){
        bestScore = score;
        bestNode = this.children[i];
      }
    }
    return bestNode;
  }

  getBestNode(){
    var bestScore = null;
    var bestNode = null;
    //console.log(this);

    for (var i = 0; i < this.children.length; i++) {
      if(this.children[i] == null) continue;
      console.log("NODE", this.children[i].moveToThisState, this.children[i].visits, this.children[i].score);
      var score = this.children[i].score / this.children[i].visits;
      if(bestScore == null || bestScore < score){
        bestScore = score;
        bestNode = this.children[i];
      }
    }
    console.log("BEST NODE", bestNode.moveToThisState);
    return bestNode;
  }

  isFullyExpanded(options){
    if(this.childMoves.length == 0) return false;
    //console.log(this.childMoves);
    var canSwap = this.depth == 0;
    for (var move in options) {
      if (options.hasOwnProperty(move) && (canSwap || move.startsWith('m'))) {
        //console.log(move, this.childMoves.includes(move));
        if(!this.childMoves.includes(move)) return false;
      }
    }
    return true;
  }

  backup(score){
    var current = this;
    while(current != null){
      current.score += score;
      current.visits++;
      current = current.parent;
    }
  }
}

exports.Agent = MCTS;
