'use strict'

var Pokemon = require('../../zarel/battle-engine').BattlePokemon;


class MCTS{
  constructor(policy){
    this.policy = policy;
    this.treeDepthLimit = 30;
  }

  decide(gameState, options, mySide, forceSwitch){
    if(forceSwitch) return this.policy.decide(gameState, options, mySide, forceSwitch);
    var startTime = new Date().getTime();

    var root = new Node();

    var iterations = 0;
    while((new Date()).getTime() - startTime <= 19000){
      var iterState = gameState.copy();

      var current = select(root, iterState, mySide);
      var score = rollout(current, iterState);
      current.backup(score);
      iterations++;
    }

    return root.getBestNode().moveToThisState;
  }

  select(root, iterState, mySide){
    var current = root;
    while(!iterState.isTerminal && current.depth < this.treeDepthLimit){
      // Is current fullyExpanded?
      var options = getOptions(iterstate, mySide.n);
      if(current.isFullyExpanded(options)){
        current = current.getUCTNode(iterState, options);
        iterState = forwardState(iterState, current.moveToThisState);
      }else{
        current = expand(current, iterState, mySide);
        return current;
      }
    }
    return current;
  }

  policyDecide(iterState, side){
    return this.policy.decide(
      iterState,
      getOptions(iterState, side),
      iterState.sides[side],
      false
    );
  }

  forwardState(iterState){
    return forwardState(iterState, policyDecide(iterState, 1));
  }

  forwardState(iterState, player1Choice){
    return forwardState(iterState, player1Choice, policyDecide(iterState, 2));
  }

  forwardState(iterState, player1Choice, player2Choice){
    iterState.choose('p1', player1Choice);
    iterState.choose('p2', player2Choice);
    return iterState;
  }

  getOptions(state, player) {
      if (typeof (player) == 'string' && player.startsWith('p')) {
          player = parseInt(player.substring(1)) - 1;
      }
      return Tools.parseRequestData(state.sides[player].getRequestData());
  }

// Use policy on both sides
  rollout(current, iterState){
    while(!iterState.isTerminal){
      iterState = forwardState(iterState);
    }
    return 0; //TODO Work out how to score this
  }

  expand(current, iterState, mySide){
    var action = selectActionForExpand(iterState, current);
  }

  selectActionForExpand(iterState, parent, mySide){
    var options = getOptions(iterstate, mySide.n);
    for (var i = 0; i < options.length; i++) {
      if(!parent.childMoves.includes(options[i])){
        var expandedNode = new Node(parent, options[i]);
        iterstate.choose('p' + (mySide.n), options[i]);
        iterstate.choose(
          'p' + (mySide.n + 1),
           this.policy.decide(
             iterState,
             getOptions(iterState, mySide.n + 1),
             iterState.sides[mySide.n + 1], false)
           );
        parent.children.push(expandedNode);
        parent.childMoves.push(options[i]);
      }
    }
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
    return (this.score / this.visits) + (this.expConstant * Math.sqrt(Math.log(this.parent.visits) / this.visits);
  }

  getUCTNode(gameState, options){
    var bestScore = this.children[0].getUCTValue;
    var bestNode = this.children[0];

    for (var i = 1; i < this.children.length; i++) {
      if(!options.includes(this.children[i].moveToThisState)){
        continue;
      }
      var score = this.children[i].getUCTValue();
      if(bestScore < score){
        bestScore = score;
        bestNode = this.children[i];
      }
    }
    return bestNode;
  }

  getBestNode(){
    var bestScore = null;
    var bestNode = null;

    for (var i = 0; i < this.children.length; i++) {
      if(this.children[i] == null) continue;
      var score = this.children[i].score / visits;
      if(bestScore == null || bestScore < score){
        bestScore = score;
        bestNode = this.children[i];
      }
    }
    return bestNode;
  }

  isFullyExpanded(options){
    if(this.children.length == 0) return false;
    for (var i = 0; i < options.length; i++) {
      if(!this.childMoves.includes(options[i]) return false;
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
