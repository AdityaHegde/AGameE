(function(){


  var operators = {
    '+' : 1,
    '-' : 1,
    '*' : 1,
    '/' : 1,
  };


  function inherit(parent, child, members) {
    child.prototype = new parent();
    child.prototype.constructor = child;
    child.parent = parent;

    for(var m in members) {
      child.prototype[m] = members[m];
    }
  }

  function Base(config) {
    for(var c in config) {
      this[c] = config[c];
    }
  }

  function EqnGen(config) {
    EqnGen.parent.call(this, config);

    this.equations = this.equations || [];
    this.unknowns = this.unknowns || [];
    this.vars = {};
    this.lhsTerms = this.lhsTerms || [];

    for(var i = 0; i < this.equationStrings.length; i++) {
      var eqn = new Eqn({equationString : this.equationStrings[i]}),
          lhsTerm = new Term({var : this.lhsVariables[i], op : "+"});
      this.equations.push(eqn);
      for(var v in eqn.vars) {
        this.vars[v] = this.vars[v] || [];
        this.vars[v].push(i);
      }
      this.lhsTerms.push(lhsTerm);
    }
  }
  inherit(Base, EqnGen, {

    simplify : function() {
      for(var i = 0; i < this.equationStrings.length; i++) {
        this.equations[i].simplify();
      }
    },

    buildMainEqn : function() {
      for(var i = 0; i < this.equations.length; i++) {
        if(i !== this.mainIndex) {
          this.equations[this.mainIndex].replace(this.lhsTerms[i], this.equations[i].equation);
        }
      }
    },

    getMainEqn : function() {
      return this.equations[this.mainIndex].convertToString();
    },

    segregate : function() {
      this.equations[this.mainIndex].segregate(this.lhsTerms[this.mainIndex]);
      return this.equations[this.mainIndex].segregated.convertToString();
    }

  });

  window.EqnGen = EqnGen;


  function Tokens(tokens) {
    Tokens.parent.call(this, {});
    this.tokens = tokens;
    this.cur = 0;
  }
  inherit(Base, Tokens, {

    next : function() {
      if(this.cur >= this.tokens.length) return undefined;
      return this.tokens[this.cur++];
    },

    back : function(c) {
      c = c || 1;
      this.cur -= c;
    },
  });


  function Term(config) {
    Term.parent.call(this, config);
    this.type = 0;

    this.pwr = this.pwr || 1;
    this.coeff = this.coeff || 1;
    
    this.init();
  }
  Term.sortFun = function(a, b) {
    return b.var < a.var;
  };
  inherit(Base, Term, {

    init : function() {
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
        if(this.pwr) this.pwr = -this.pwr;
      }
    },

    parse : function(tokens) {
      var t = tokens.next();
      if(operators[t]) {
        this.op = t;
        if(this.op === "-") {
          this.coeff = -this.coeff;
          this.op = "+";
        }
        else if(this.op === "/") {
          this.coeff = 1/this.coeff;
          this.op = "*";
          if(this.pwr) this.pwr = -this.pwr;
        }
        t = tokens.next();
      }
      if(Number.isNaN(t) === "false") {
        this.coeff *= Number(t);
        t = tokens.next();
      }
      if(operators[t]) {
        if(t === "+" || t === "-" || t === ")") {
          tokens.cur--;
          return this;
        }
        else if(t === "*" || t === "/") {
          t = tokens.next();
          if(t === "/") this.pwr = -this.pwr;
        }
        else if(t === "^") {
          t = tokens.next();
          this.coeff = Math.pow(this.coeff, Number(t));
          return this;
        }
      }
      this.var = t;
      t = tokens.next();
      if(operators[t]) {
        if(t === "^") {
          t = tokens.next();
          this.pwr *= Number(t);
          return this;
        }
      }
      tokens.cur--;
      return this;
    },

    equalTo : function(term, typeOnly) {
      if(term.var && this.var === term.var && (typeOnly || this.pwr === term.pwr)) return 1;
      return 0;
    },

    add : function(term) {
      if(this.equalTo(term) === 1) {
        this.coeff = this.coeff + term.coeff;
        return 1;
      }
      return 0;
    },

    power : function(pwr) {
      if(pwr !== 0) {
        this.pwr = (this.pwr ? this.pwr * pwr : pwr);
        this.coeff = Math.pow(this.coeff, pwr);
        return this;
      }
      return null;
    },

    simplify : function() {
      return this;
    },

    condense : function() {
      return this;
    },

    multiply : function(term) {
      var t = new TermMultiply({terms : [this]});
      return t.multiply(term);
    },

    copy : function() {
      return new Term({coeff : this.coeff, var : this.var, pwr : this.pwr, op : this.op});
    },

    replace : function(term, withTerm) {
      if(term.var && term.var === this.var) {
        var ret = withTerm.copy();
        ret.pwr *= this.pwr;
        if(ret.type === 2) {
          for(var i = 0; i < ret.terms.length; i++) {
            ret.terms[i].coeff *= this.coeff;
          }
        }
        else {
          ret.coeff *= this.coeff;
        }
        return ret;
      }
      return this;
    },

    segregate : function(term) {
      var t = null;
      if(this.var === term.var) {
        t = this.copy();
        this.coeff = 1;
        this.var = "";
        this.pwr = 1;
      }
      return [t, this];
    },

    convertToString : function () {
      if(this.var) {
        return (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"") + this.var + (this.pwr !== 1 ? "^"+this.pwr : "");
      }
      else {
        return (this.coeff < 0 ? "("+this.coeff+")":this.coeff);
      }
    },

  });

  function TermBracket(config) {
    TermMultiply.parent.call(this, config);
  }
  inherit(Term, TermBracket, {

    init : function() {
      this.type = 2;
    },

    parse : function(tokens) {
      var t, term = new TermBracket({terms : []}), ct;
      while(t !== ")") {
        ct = new Term({}).parse(tokens);
        t = tokens.next();
        if(t === "*" || t === "/") {
          tokens.cur--;
          this.addTerm(new TermMultiply({terms : [ct]}));
        }
        else {
          tokens.cur--;
          this.addTerm(ct);
        }
      }
    },

    equalTo : function(term) {
      if(term.type !== 2 || this.terms.length === term.terms.length) {
        return 0;
      }
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms.equalTo(term.terms[i]) === 0) {
          return 0
        }
      }
      return 1;
    },

    add : function(term) {
      if(term.type === 2 && term.pwr === 1) {
        for(var i = 0; i < term.terms.length; i++) {
          this.terms.push(term.terms[i]);
        }
      }
      else {
        this.terms.push(term);
      }
    },

    addTerm : function(term) {
      this.add(term);
    },

    power : function(pwr) {
      var ncr = 1, terms = this.terms,
          st = terms.shift(), mt,
          br = 0;

      if(pwr === 0) return null;

      this.terms = [];
      if(terms.length !== 1) {
        mt = new TermBracket({terms : terms});
        br = 1;
      }
      else {
        mt = terms.shift();
      }
      for(var i = 0; i <= pwr; i++) {
        var sti = st.copy(), mti = mt.copy();
        sti = sti.power(pwr - i);
        mti = mti.power(i);
        var ct;
        if(br !== 1) {
          if(mti) {
            if(sti) {
              ct = new TermMultiply({terms : [mti], coeff : ncr});
              ct.multiply(sti);
            }
            else {
              ct = mti;
            }
          }
          else {
            ct = sti;
            ct.coeff *= ncr;
          }
        }
        else {
          if(mti) {
            ct = mti;
            if(sti) {
              sti.coeff *= ncr;
              ct.multiply(sti);
            }
          }
          else {
            ct = sti;
            ct.coeff *= ncr;
          }
        }
        ct = ct.condense();
        this.add(ct);
        ncr *= (pwr - i)/(i + 1);
      }
      this.pwr = 1;
      return this;
    },

    simplify : function() {
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        terms[i] = terms[i].simplify();
        if(terms[i]) this.add(terms[i]);
      }
      var t = this.condense();
      if(t && t.type > 0 && t.pwr !== 1) {
        t = t.power(t.pwr);
      }

      return t;
    },

    condense : function() {
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length - 1; i++) {
        if(terms[i] === 0) continue;
        for(var j = i + 1; j < terms.length; j++) {
          if(terms[j] === 0) continue;
          if(terms[i].add(terms[j]) !== 0) {
            terms[j] = 0;
          }
        }
        if(terms[i].coeff !== 0) {
          this.add(terms[i]);
        }
      }
      if(terms[terms.length - 1] !== 0) this.add(terms[terms.length - 1]);

      if(this.terms.length === 1) {
        this.terms[0].coeff *= this.coeff;
        if(this.pwr !== 1) this.terms[0].pwr = this.pwr;
        return this.terms.pop();
      }
      else {
        return this;
      }
      return null;
    },

    multiply : function(term) {
      if(term.type < 2) {
        var terms = this.terms;
        this.terms = [];
        for(var i = 0; i < terms.length; i++) {
          terms[i] = (terms[i].terms ? terms[i] : new TermMultiply({terms : [terms[i]]}));
          terms[i].addTerm(term.copy());
          terms[i] = terms[i].simplify();
          if(terms[i]) this.addTerm(terms[i]);
        }
      }
      else {
        var terms = this.terms;
        this.terms = [];
        for(var i = 0; i < terms.length; i++) {
          for(var j = 0; j < term.terms.length; j++) {
            var t = new TermMultiply({terms : [terms[i].copy()]});
            t.multiply(term.terms[j].copy());
            this.terms.push(t);
          }
        }
      }
      return this;
    },

    copy : function() {
      var c = new TermBracket({pwr : this.pwr, terms : []});
      for(var i = 0; i < this.terms.length; i++) {
        c.addTerm(this.terms[i].copy());
      }
      return c;
    },

    replace : function(term, withTerm) {
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i] = this.terms[i].replace(term, withTerm);
      }
      return this;
    },

    segregate : function(term) {
      var terms = this.terms,
          pwr = {};
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        var t = terms[i].segregate(term);
        if(t[0]) {
          if(!pwr[t[0].pwr]) {
            pwr[t[0].pwr] = new TermMultiply({terms : [t[0]]});
            pwr[t[0].pwr].addTerm(new TermBracket({terms : []}));
          }
          pwr[t[0].pwr].terms[0].addTerm(t[1]);
        }
        else {
          this.addTerm(t[1]);
        }
      }
      for(var p in pwr) {
        this.addTerm(pwr[p]);
      }
      return this;
    },

    convertToString : function () {
      var str = "(";
      for(var i = 0; i < this.terms.length; i++) {
        var s = this.terms[i].convertToString();
        str += s;
        if(i < this.terms.length - 1) str += "+";
      }
      str += ")";
      return str;
    },
    
  });


  function TermMultiply(config) {
    TermMultiply.parent.call(this, config);

    this.type = 1;
  }
  inherit(Term, TermMultiply, {

    init : function() {
      this.coeff = this.coeff || 1;
      for(var i = 0; i < this.terms.length; i++) {
        this.coeff *= this.terms[i].coeff;
        this.terms[i].coeff = 1;
      }
      this.terms.sort(Term.sortFun);
    },

    addTerm : function(term) {
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].equalTo(term, "true") === 1) {
          this.terms[i].pwr += term.pwr;
          if(this.terms[i].pwr === 0) {
            this.terms.splice(i, 1);
          }
          return;
        }
      }
      this.terms.push(term);
      this.terms.sort(Term.sortFun);
      this.coeff *= term.coeff;
      term.coeff = 1;
    },

    equalTo : function(term, typeOnly) {
      if(term.terms && this.terms.length === term.terms.length) {
        for(var i = 0; i < this.terms.length; i++) {
          if(this.terms[i].equalTo(term.terms[i], typeOnly) === 0) {
            return 0;
          }
        }
        return 1;
      }
      return 0;
    },

    power : function(pwr) {
      if(pwr !== 0) {
        this.coeff = Math.pow(this.coeff, pwr);
        for(var i = 0; i < this.terms; i++) {
          this.terms[i].power(pwr);
        }
        this.pwr = 1;
        return this;
      }
      return null;
    },

    simplify : function() {
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        terms[i] = terms[i].simplify();
        if(terms[i]) this.addTerm(terms[i]);
      }

      var t = this.condense(),
          mts = [], stm = new TermMultiply({terms : []}), bt = null;
      if(!t.terms) return t;
      for(var i = 0; i < t.terms.length; i++) {
        if(t.terms[i].type === 0) {
          stm.addTerm(t.terms[i]);
        }
        else {
          if(!bt) bt = t.terms[i];
          else mts.push(t.terms[i]);
        }
      }
      if(bt) {
        for(var i = 0; i < bt.terms.length; i++) {
          bt.terms[i].coeff *= this.coeff;
        }
      }
      if(stm.terms.length !== 0) {
        if(!bt) {
          return t;
        }

        bt.multiply(stm);
      }

      for(var i = 0; i < mts.length; i++) {
        bt.multiply(mts[i]);
      }

      bt.coeff = this.coeff;
      bt = bt.simplify();
      if(bt.terms.length === 1) {
        bt.terms[0].coeff *= bt.coeff;
        return bt.terms.pop();
      }
      if(bt.terms.length === 0) return null;

      return bt;
    },

    condense : function() {
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length - 1; i++) {
        if(terms[i] === 0) continue;
        for(var j = i + 1; j < terms.length; j++) {
          if(terms[j] === 0) continue;
          if(terms[i].equalTo(terms[j]) === 1) {
            terms[i].pwr += terms[j].pwr;
            terms[j] = 0;
          }
        }
        if(terms[i].pwr !== 0) {
          if(terms[i]) this.addTerm(terms[i]);
        }
      }
      if(terms[terms.length - 1] !== 0) this.addTerm(terms[terms.length - 1]);
      if(this.terms.length === 1) {
        this.terms[0].coeff *= this.coeff;
        return this.terms.pop();
      }
      if(this.terms.length === 0) return null;
      this.terms = terms;
      return this;
    },

    multiply : function(term) {
      var ts = (term.terms ? term.terms:[term]);
      for(var i = 0; i < ts.length; i++) {
        this.addTerm(ts[i]);
      }
      this.coeff *= term.coeff;
      return this;
    },

    copy : function() {
      var c = new TermMultiply({pwr : this.pwr, coeff : this.coeff, terms : []});
      for(var i = 0; i < this.terms.length; i++) {
        c.addTerm(this.terms[i].copy());
      }
      return c;
    },

    replace : function(term, withTerm) {
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i] = this.terms[i].replace(term, withTerm);
      }
      return this;
    },

    segregate : function(term) {
      var t = null;
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].var === term.var) {
          t = this.terms[i];
          this.terms.splice(i, 1);
          break;
        }
      }
      return [t, this];
    },

    convertToString : function () {
      var str = (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"");
      for(var i = 0; i < this.terms.length; i++) {
        var s = this.terms[i].convertToString();
        str += s;
      }
      return str;
    },

  });


  
  function Eqn(config) {
    Eqn.parent.call(this, config);

    this.vars = {};
    if(this.equationString) this.parseStr(this.equationString);
  }
  window.Eqn = Eqn;
  inherit(Base, Eqn, {

    parseTokens : function(tokens, coeff) {
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
          nt = new TermBracket({terms : this.parseTokens(tokens, co)});
        }
        else if(operators[t]) {
          nt = new Term({coeff : co, op : op});
          co = coeff;
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
          mt.addTerm(nt);
        }
        if(!operators[t]) {
          t = tokens.next();
          if(t) {
            if(t === ")") {
              ts.push(nt);
              break;
            }
            if(t === "^") {
              var sign = 1;
              t = tokens.next();
              if(t === "-") {
                sign = -1;
                t = tokens.next();
              }
              nt.pwr *= sign * Number(t);
              t = tokens.next();
            }
            if(operators[t]) {
              op = t;
              if(op === "*" || op === "/") {
                if(!mt) mt = new TermMultiply({terms : [nt]});
                if(op === "/") nt.pwr = -nt.pwr;
              }
              else {
                if(mt) {
                  ts.push(mt);
                  nt = null;
                }
                mt = null;
              }
            }
          }
        }
        
        if(!mt && nt) ts.push(nt);
        t = tokens.next();
      }
      if(mt) ts.push(mt);
      return ts;
    },

    parseStr : function(str) {
      str = str.replace(/\s+/g, " ");
      str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
      str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
      str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");

      this.equation = new TermBracket({terms : this.parseTokens(new Tokens(str.split(" ")), 1)});
    },

    simplify : function() {
      this.equation = this.equation.simplify();
    },

    replace : function(term, withTerm) {
      this.equation = this.equation.replace(term, withTerm);
      this.simplify();
    },

    segregate : function(term) {
      var s;
      this.segregated = this.equation.copy();
      s = this.segregated.segregate(term);
      //if(s.length) return s[1];
      //else return s;
    },

    convertToString : function() {
      return this.equation.convertToString();
    },

  });

})();
