(function(){

  function inherit(parent, 

  function Base(config) {
    for(var c in config) {
      this[c] = config[c];
    }
  }

  function EqnGen(config) {
  }

  window.EqnGen = EqnGen;


  function Tokens(tokens) {
    this.tokens = tokens;
    this.cur = 0;
  }
  Tokens.prototype.next = function() {
    if(this.cur >= this.tokens.length) return undefined;
    return this.tokens[this.cur++];
  };
  Tokens.prototype.back = function(c) {
    c = c || 1;
    this.cur -= c;
  };


  function Term(config) {
    for(var c in config) {
      this[c] = config[c];
    }
    if(this.terms) {
      
    }
    else {
      this.var = this.var || "";
      this.coeff = Number(this.coeff) || 1;
      var c = /^(\d*)(.*)$/.exec(this.var);
      if(c[1] !== "") {
        this.coeff *= Number(c[1]);
      }
      this.var = c[2];
      if(this.op === "-") {
        this.coeff = -this.coeff;
        this.op = "+";
      }
      else if(this.op === "/") {
        this.coeff = 1/this.coeff;
        this.op = "*";
      }
    }
  }
  Term.prototype.add = function(term) {
    if(this.var === term.var && this.pwr === term.pwr) {
      this.coeff = (this.op === "+" ? this.coeff + term.coeff : this.coeff * term.coeff);
      return 1;
    }
    return 0;
  };
  Term.prototype.power = function() {
    
  };
  Term.prototype.simplify = function() {
    if(this.terms) {
      if(this.pwr) {
        
      }
      var ts = [], tsf = [];
      for(var t in this.terms) {
        var ts1 = this.terms[t].simplify();
        for(var t1 in ts1) ts.push(ts1[t1]);
      }
      for(var i = 0; i < ts.length - 1; i++) {
        if(ts[i] === 0) continue;
        for(var j = i + 1; j < ts.length; j++) {
          if(ts[j] === 0) continue;
          if(ts[i].add(ts[j]) === 1) {
            ts[j] = 0;
          }
        }
        if(ts[i].coeff !== 0) tsf.push(ts[i]);
      }
      if(ts[ts.length - 1] !== 0 && ts[ts.length - 1].coeff !== 0) tsf.push(ts[ts.length - 1]);
      return tsf;
    }
    else {
      return [this];
    }
  };

  function TermMultiply(config) {
    this.terms = config.terms;
  }
  
  function Eqn(config) {
    for(var c in config) {
      this[c] = config[c];
    }
    this.vars = {};
    if(this.equationString) this.parseStr(this.equationString);
  }
  window.Eqn = Eqn;

  var operators = {
    '+' : 1,
    '-' : 1,
    '*' : 1,
    '/' : 1,
  };

  Eqn.prototype.parseTokens = function(tokens, coeff) {
    var ts = [], nt, mt,
        co = coeff,
        t = tokens.next(),
        op = "+";
    while(t) {
      if(t === ")") break;
      if(t === "(") {
        if(op === "-") {
          co = -co;
        }
        else if(op === "/") {
          co = 1/co;
        }
        nt = new Term({terms : this.parseTokens(tokens, co)});
      }
      else if(operators[t]) {
        nt = new Term({coeff : co, op : op});
      }
      else {
        if(/^(\d+)$/.test(t)) {
          co *= t;
          t = tokens.next();
          continue;
        }
        this.vars[t] = 1;
        nt = new Term({var : t, coeff : co, op : op});
        co = coeff;
      }
      if(mt) {
        mt.terms.push(nt);
      }
      if(!operators[t]) {
        t = tokens.next();
        if(t) {
          if(t === "^") {
            t = tokens.next();
            nt.pwr = Number(t);
            t = tokens.next();
          }
          if(operators[t]) {
            op = t;
            if(op === "*" || op === "/") {
              mt = new Term({terms : [nt]});
            }
            else {
              if(mt) ts.push(mt);
              mt = null;
            }
          }
        }
      }
      
      if(!mt) ts.push(nt);
      t = tokens.next();
    }
    if(mt) ts.push(mt);
    return ts;
  };

  Eqn.prototype.parseStr = function(str) {
    str = str.replace(/\s+/g, " ");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
    str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");

    this.equation = new Term({terms : this.parseTokens(new Tokens(str.split(" ")), 1)});
  };

  Eqn.prototype.simplify = function() {
    this.equation = new Term({terms : this.equation.simplify()});
  };

  EqnGen.prototype.init = function(config) {
    for(var c in config) {
      this[c] = config[c];
    }
    this.equations = this.equations || [];
    this.unknowns = this.unknowns || [];

    if(this.equationStrings) {
      for(var i = 0; i < this.equationStrings.length; i++) {
        this.equations.push(new Eqn({equationString : this.equationStrings[i]}));
      } 
    }
  };
})();
