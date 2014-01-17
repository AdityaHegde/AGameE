(function(){


  var operators = {
    '+' : 1,
    '-' : 1,
    '*' : 1,
    '/' : 1,
  },
  NUMBER_REGEX = /^[0-9]*(?:\.[0-9]+)?$/,
  indexMap = {
    'x' : 0,
    'y' : 1,
    'z' : 2,
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
    this.unknowns = this.unknowns || {};
    this.vars = {};
    this.lhsTerms = this.lhsTerms || [];
    var unknsF = 1;//(this.unknowns.length === 0);

    for(var i = 0; i < this.equationStrings.length; i++) {
      var eqn = new Eqn({equationString : this.equationStrings[i]}),
          lhsTerm = new Term({var : this.lhsVariables[i], op : "+"});
      this.equations.push(eqn);
      for(var v in eqn.vars) {
        this.vars[v] = this.vars[v] || [];
        this.vars[v].push(i);
      }
      this.lhsTerms.push(lhsTerm);
      if(unknsF) this.unknowns[this.lhsVariables[i]] = 1;
    }
  }
  inherit(Base, EqnGen, {

    simplify : function() {
      for(var i = 0; i < this.equationStrings.length; i++) {
        if(i !== this.mainIndex) this.equations[i].simplify(this.lhsTerms[this.mainIndex]);
        this.equations[i].getVars(this.unknowns);
      }
    },

    buildMainEqn : function() {
      for(var i = 0; i < this.equations.length; i++) {
        if(i !== this.mainIndex) {
          this.equations[this.mainIndex].replace(this.lhsTerms[i], this.equations[i].equation, this.lhsTerms[this.mainIndex]);
        }
      }
      this.equations[this.mainIndex].simplify(this.lhsTerms[this.mainIndex]);
      this.equations[this.mainIndex].getVars(this.unknowns);
    },

    getMainEqn : function() {
      return this.equations[this.mainIndex].convertToString();
    },

    segregate : function() {
      this.equations[this.mainIndex].segregate(this.lhsTerms[this.mainIndex]);
      this.equations[this.mainIndex].sortAndStringify();
      this.equations[this.mainIndex].factorize(this.lhsTerms[this.mainIndex]);
      this.equations[this.mainIndex].getVars(this.unknowns);
      this.equations[this.mainIndex].sortAndStringify();
      this.equations[this.mainIndex].segregated = this.equations[this.mainIndex].segregated.condense();
      return this.equations[this.mainIndex].segregated.convertToString();
    },

    convertToString : function() {
      var str = "";
      for(var i = 0; i < this.equations.length; i++) {
        if(i === this.mainIndex) str += "M: ";
        if(this.lhsTerms[i].var) str += this.lhsTerms[i].var+" = ";
        str += this.equations[i].convertToString();
        if(i < this.equations.length - 1) str += "<br>";
      }
      return str;
    },

    factorize : function() {
      this.equations[this.mainIndex].factorize(this.lhsTerms[this.mainIndex]);
    },

    getCode : function() {
      var mainEqn = this.equations[this.mainIndex], mainTerm = this.lhsTerms[this.mainIndex],
          code = "", eqns = [], varsUsed = {};
      for(var i = 0; i < this.equations.length; i++) {
        eqns.push(this.equations[i].copy());
      }
      eqns[this.mainIndex] = 0;
      for(var i = 0; i < this.equations.length; i++) {
        if(this.equations[i].hasUnknowns === 0) {
          if(!this.equations[i]) this.equations[i].segregate(this.lhsTerms[i]);
          code += window.EqnSolver.solve_single_var_master(eqns, this.lhsTerms[i], this.equations[i], this.unknowns, this.lhsTerms, varsUsed);
          this.equations[i] = 0;
        }
      }
      code += window.EqnSolver.solve_single_var_master(eqns, mainTerm, mainEqn, this.unknowns, this.lhsTerms, {});
      return code;
    },

    sortAndStringify : function() {
      this.equations[this.mainIndex].sortAndStringify();
    },

    getSortedStr : function() {
      return this.equations[this.mainIndex].getSortedStr();
    },

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
      if(this.cur + c <= this.tokens.length) {
        this.cur -= c;
      }
    },

    isEmpty : function() {
      return this.cur >= this.tokens.length;
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
      this.var = "";
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
      if(t === "(") {
        tokens.back(2);
        return new TermBracket({terms : []}).parse(tokens);
      }
      var isNum = 0;
      if(NUMBER_REGEX.exec(t)) {
        this.coeff *= Number(t);
        t = tokens.next();
        isNum = 1;
      }
      if(operators[t]) {
        if(t === "+" || t === "-" || t === ")") {
          tokens.back();
          return this;
        }
        else {
          if(isNum === 1) {
            tokens.back();
            return this;
          }
          if(t === "*" || t === "/") {
            if(t === "/") this.pwr = -this.pwr;
            t = tokens.next();
          }
          else if(t === "^") {
            t = tokens.next();
            this.coeff = Math.pow(this.coeff, Number(t));
            return this;
          }
        }
      }
      this.var = t;
      t = tokens.next();
      if(t === "^") {
        t = tokens.next();
        if(t === "-") {
          this.pwr = -this.pwr;
          t = tokens.next();
        }
        this.pwr *= Number(t);
        return this;
      }
      if(t) tokens.back();
      return this;
    },

    equalTo : function(term, typeOnly) {
      if(this.sortStr && term.sortStr && this.sortStr === term.sortStr) return 1;
      else if(term.var && this.var === term.var && (typeOnly || this.pwr === term.pwr)) return 1;
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

    simplify : function(sterm) {
      return this;
    },

    condense : function() {
      this.sortAndStringify();
      return this;
    },

    multiply : function(term, sterm) {
      if(term.type > 0) return term.multiply(this, sterm);
      var t = new TermMultiply({terms : [this]});
      return t.multiply(term, sterm);
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

    segregate : function(term, pwr) {
      var t = null;
      if(this.var === term.var && (!pwr || this.pwr >= pwr)) {
        t = this.copy();
        t.coeff = 1;
        if(pwr && this.pwr > pwr) {
          this.pwr -= pwr;
          t.pwr = pwr;
        }
        else {
          this.var = "";
          this.pwr = 1;
        }
      }
      return [t, this];
    },

    hasSTerm : function(sterm) {
      if(!sterm) return 1;
      if(this.var && sterm.var === this.var) return 1;
      return 0;
    },

    convertToString : function () {
      if(this.var) {
        return (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"") + this.var + (this.pwr !== 1 ? "^"+this.pwr : "");
      }
      else {
        return (this.coeff < 0 ? "("+this.coeff+")":this.coeff);
      }
    },

    factorize : function(sterm) {
      return this;
    },

    getVars : function(varRef) {
      if(this.var) {
        var arr = /^(.*?)\[\d+\]$/.exec(this.var);
        if(arr) varRef[arr[1]] = {Array : 1};
        varRef[this.var] = varRef[this.var] || {};
        varRef[this.var][this.pwr || 1] = 1;
      }
    },

    getCode : function() {
      var str = "", cf = 0;
      if(this.var) {
        var idx = indexMap[this.var.charAt(0)];
        if(idx || idx === 0) {
          str += this.var.substr(1) + "[" + idx + "]";
        }
        else {
          str += this.var;
        }
        cf = 1;
      }
      if(this.pwr !== 1) {
        str = "Math.pow(" + str +", " + this.pwr + ")";
        cf = 1;
      }
      if(this.coeff && (cf === 0 || this.coeff !== 1)) {
        str = this.coeff + (cf === 1 ? "*":"") + str;
      }
      return str;
    },

    sortAndStringify : function() {
      if(this.var) {
        this.sortStr = this.var + (this.pwr !== 1 ? "^"+this.pwr : "");
        this.fullStr = (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"") + this.sortStr;
      }
      else {
        this.sortStr = 1;
        this.fullStr = (this.coeff < 0 ? "("+this.coeff+")":this.coeff);
      }
    },

  });

  function TermBracket(config) {
    TermMultiply.parent.call(this, config);
  }
  TermBracket.strcmp = function(a, b) {return a.length === b.length ? (a > b ? 1 : -1) : (a.length > b.length ? 1 : -1)};
  TermBracket.strcmp1 = function(a, b) {return a.length === b.length ? (a == b ? 0 : (a > b ? 1 : -1)) : (a.length > b.length ? 1 : -1)};
  TermBracket.comparator = function(a, b) {
    if(a[0] === b[0]) {
      var strcmp = TermBracket.strcmp1(a[1], b[1]);
      if(strcmp === 0) a[2] - b[2];
      return -strcmp;
    }
    return a[0] - b[0];
  };
  TermBracket.sort_fun = function(a, b) {return TermBracket.strcmp(a.sortStr, b.sortStr)};
  inherit(Term, TermBracket, {

    init : function() {
      this.type = 2;
    },

    parse : function(tokens) {
      var t = tokens.next(), ct;
      if(operators[t]) {
        if(t === "-") this.coeff = -this.coeff;
        else if(t === "/") this.pwr = -this.pwr;
        t = tokens.next();
      }
      else tokens.back();
      while(!tokens.isEmpty()) {
        t = tokens.next();
        if(t === "(") {
          //tokens.back();
          ct = new TermBracket({terms : []}).parse(tokens);
        }
        else {
          tokens.back();
          ct = new Term({}).parse(tokens);
        }
        t = tokens.next();
        if(t === "*" || t === "/") {
          tokens.back();
          this.addTerm(new TermMultiply({terms : [ct]}).parse(tokens));
        }
        else {
          tokens.back();
          this.addTerm(ct);
        }
        t = tokens.next();
        if(t === ")") break;
        if(!t) return this;
        tokens.back();
      }
      t = tokens.next();
      if(t === "^") {
        this.pwr = Number(tokens.next());
      }
      else if(t) {
        tokens.back();
      }
      return this;
    },

    equalTo : function(term) {
      if(this.sortStr && term.sortStr && this.sortStr === term.sortStr) return 0;
      else if(term.type !== 2 || this.terms.length !== term.terms.length) {
        return 0;
      }
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].equalTo(term.terms[i]) === 0) {
          return 0
        }
      }
      return 1;
    },

    addTerm : function(term) {
      if(!term) {
        console.log(0);
      }
      if(term.type === 2 && term.pwr === 1) {
        for(var i = 0; i < term.terms.length; i++) {
          this.terms.push(term.terms[i]);
          term.terms[i].coeff *= term.coeff;
        }
      }
      else {
        this.terms.push(term);
      }
    },

    power : function(pwr, sterm, dontRaisePwr) {
      var ncr = 1, ts = this.terms,
          st, mt, terms = [],
          br = 0, stf = 0;

      if(pwr === 0) return null;

      for(var i = 0; i < ts.length; i++) {
        if(ts[i].hasSTerm(sterm) === 1) {
          terms.unshift(ts[i]);
          stf = 1;
        }
        else terms.push(ts[i]);
      }
      if(stf === 0) {
        if(!dontRaisePwr) this.pwr *= pwr;
        return this;
      }
      st = terms.shift();

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
        sti = sti.power(pwr - i, sterm);
        mti = mti.power(i, sterm);
        var ct = sti || mti;
        if(sti && mti) ct = ct.multiply(mti);
        ct.coeff *= ncr;
        ct = ct.condense();
        this.addTerm(ct);
        ncr *= (pwr - i)/(i + 1);
      }
      this.pwr = 1;
      return this.condense();
    },

    simplify : function(sterm) {
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        terms[i] = terms[i].simplify(sterm);
        if(terms[i]) this.addTerm(terms[i]);
      }
      var t = this.condense();
      if(t && t.type > 0 && t.pwr !== 1) {
        t = t.power(t.pwr, sterm, 1);
      }

      return t;
    },

    condense : function() {
      this.sortAndStringify();
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
          this.addTerm(terms[i]);
        }
      }
      if(terms[terms.length - 1] !== 0) this.addTerm(terms[terms.length - 1]);

      if(this.terms.length === 1) {
        this.terms[0].coeff *= this.coeff;
        if(this.pwr !== 1) this.terms[0].pwr = this.pwr;
        return this.terms.pop();
      }
      else {
        var hcf = this.terms[0].coeff;;
        for(var i = 1; i < this.terms.length && hcf !== 1; i++) {
          hcf = Math.hcf(hcf, this.terms[i].coeff);
        }
        if(hcf !== 1) {
          for(var i = 0; i < this.terms.length && hcf !== 1; i++) {
            this.terms[i].coeff /= hcf;
          }
          this.coeff *= hcf;
        }
        return this;
      }
      return null;
    },

    multiply : function(term, sterm) {
      if(term.type < 2) {
        for(var i = 0; i < this.terms.length; i++) {
          this.terms[i] = this.terms[i].multiply(term, sterm);
        }
      }
      else {
        var terms = this.terms;
        this.terms = [];
        for(var i = 0; i < terms.length; i++) {
          for(var j = 0; j < term.terms.length; j++) {
            this.terms.push(terms[i].multiply(term.terms[j]));
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

    segregate : function(term, pwr) {
      var terms = this.terms,
          pwrRef = {};
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        var t = terms[i].segregate(term, pwr);
        if(t[0]) {
          if(!pwrRef[t[0].pwr]) {
            pwrRef[t[0].pwr] = new TermMultiply({terms : [t[0]]});
            pwrRef[t[0].pwr].addTerm(new TermBracket({terms : []}));
          }
          t[1] = t[1].condense();
          pwrRef[t[0].pwr].terms[0].addTerm(t[1]);
        }
        else {
          this.addTerm(t[1]);
        }
      }
      for(var p in pwrRef) {
        //if(pwrRef[p].terms[0].terms.length === 1) pwrRef[p] = pwrRef[p].simplify();
        pwrRef[p].terms[0] = pwrRef[p].terms[0].condense();
        this.addTerm(pwrRef[p]);
      }
      return [null, this];
    },

    hasSTerm : function(sterm) {
      if(!sterm) return 1;
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].hasSTerm(sterm) === 1) return 1;
      }
      return 0;
    },

    convertToString : function () {
      var str = (this.coeff && this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")": this.coeff):"") +  "(";
      for(var i = 0; i < this.terms.length; i++) {
        var s = this.terms[i].convertToString();
        str += ""+s;
        if(i < this.terms.length - 1) str += "+";
      }
      str += ")";
      if(this.pwr && this.pwr !== 1) str += "^"+this.pwr;
      return str;
    },

    _termFound : function(termHeap, term, termRef) {
      for(var i = 1; i <= term.pwr; i++) {
        var key = term.var+"_"+i;
        if(termRef[key]) {
          termRef[key][0]++;
          heap.modified(termHeap, termRef[key], TermBracket.comparator);
        }
        else {
          termRef[key] = [1, term.var, i];
          heap.insert(termHeap, termRef[key], TermBracket.comparator);
        }
      }
    },

    factorize : function(sterm) {
      var f = 1;
      while(f === 1) {
        var termHeap = [], termRef = {};
        for(var i = 0; i < this.terms.length; i++) {
          this.terms[i] = this.terms[i].factorize(sterm);
          if(!this.terms[i].hasSTerm(sterm)) {
            if(this.terms[i].type === 0 && this.terms[i].var) {
              this._termFound(termHeap, this.terms[i], termRef);
            }
            else if(this.terms[i].type === 1) {
              for(var j = 0; j < this.terms[i].terms.length; j++) {
                if(this.terms[i].terms[j].type === 0 && this.terms[i].terms[j].var) {
                  this._termFound(termHeap, this.terms[i].terms[j], termRef);
                }
              }
            }
          }
        }
        f = 0;
        if(termHeap.length > 0 && termHeap[0][0] > 1) {
          this.segregate(new Term({var : termHeap[0][1]}), termHeap[0][2]);
          this.sortAndStringify();
          if(this.terms.length === 1) {
            var t = this.terms.pop();
            t.coeff *= this.coeff;
            t.pwr *= this.pwr;
            return t.factorize(sterm);
          }
          f = 1;
        }
      }
      return this;
    },

    getVars : function(varRef) {
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i].getVars(varRef);
      }
    },

    getCode : function () {
      var str = (this.coeff && this.coeff !== 1 ? this.coeff+"*":"") +  "(";
      for(var i = 0; i < this.terms.length; i++) {
        var s = this.terms[i].getCode();
        str += ""+s;
        if(this.terms.length > 1 && i < this.terms.length - 1) str += "+";
      }
      str += ")";
      if(this.pwr && this.pwr !== 1) str = "Math.pow(" + str +", " + this.pwr + ")";
      return str;
    },

    sortAndStringify : function() {
      this.fullStr = (this.coeff && this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")": this.coeff):"");
      this.sortStr = "(";
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i].sortAndStringify();
      }
      this.terms.sort(TermBracket.sort_fun);
      for(var i = 0; i < this.terms.length; i++) {
        this.sortStr += this.terms[i].fullStr;
        if(i < this.terms.length - 1) this.sortStr += "+";
      }
      this.sortStr += ")";
      if(this.pwr && this.pwr !== 1) this.sortStr += "^"+this.pwr;
      this.fullStr += this.sortStr;
    },
    
  });


  function TermMultiply(config) {
    TermMultiply.parent.call(this, config);

    this.type = 1;
  }
  inherit(Term, TermMultiply, {

    init : function() {
      this.coeff = this.coeff || 1;
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        this.coeff *= terms[i].coeff;
        if(terms[i].type === 1) {
          for(var j = 0; j < terms[i].terms.length; j++) {
            terms[i].terms[j].coeff = 1;
            this.terms.push(terms[i].terms[j]);
          }
        }
        else {
          terms[i].coeff = 1;
          this.terms.push(terms[i]);
        }
      }
      this.terms.sort(Term.sortFun);
    },

    parse : function(tokens) {
      var t = tokens.next(), ct;
      if(this.terms.length === 0) {
        if(t === "-") this.coeff = -this.coeff;
        else if(t === "/") this.pwr = -this.pwr;
        t = tokens.next();
        if(NUMBER_REGEX.exec(t)) this.coeff *= Number(t);
        else tokens.back();
      }
      else tokens.back();
      while(!tokens.isEmpty()) {
        ct = new Term({}).parse(tokens);
        this.addTerm(ct);
        t = tokens.next();
        if(t === "+" || t === "-" || t === ")") {
          tokens.back();
          return this;
        }
        else if(t) tokens.back();
      }
      return this;
    },

    addTerm : function(term) {
      if(term.var || !term.terms || term.pwr !== 1) {
        for(var i = 0; i < this.terms.length; i++) {
          if(this.terms[i].equalTo(term, "true") === 1) {
            this.terms[i].pwr += term.pwr;
            if(this.terms[i].pwr === 0) {
              this.terms.splice(i, 1);
            }
            return;
          }
        }
        if(term.var || term.terms) {
          this.terms.push(term);
          this.terms.sort(Term.sortFun);
        }
        if(term.pwr >= 0) this.coeff *= term.coeff;
        else this.coeff /= term.coeff;
        term.coeff = 1;
      }
      else if(term.type === 1) {
        for(var i = 0; i < term.terms.length; i++) {
          this.addTerm(term.terms[i]);
        }
        if(term.pwr >= 0) this.coeff *= term.coeff;
        else this.coeff /= term.coeff;
        term.coeff = 1;
        term.terms = [];
      }
      else if(term.type === 1) {
        for(var i = 0; i < term.terms.length; i++) {
          this.coeff *= term.terms[i].coeff;
          term.terms[i].coeff = 1;
          this.terms.push(term.terms[i]);
        }
        this.terms.sort(Term.sortFun);
      }
      else {
        this.terms.push(term);
        this.terms.sort(Term.sortFun);
        if(term.pwr >= 0) this.coeff *= term.coeff;
        else this.coeff /= term.coeff;
        term.coeff = 1;
      }
    },

    equalTo : function(term, typeOnly) {
      if(this.sortStr && term.sortStr && this.sortStr === term.sortStr) return 1;
      else if(term.terms && this.terms.length === term.terms.length) {
        for(var i = 0; i < this.terms.length; i++) {
          if(this.terms[i].equalTo(term.terms[i], typeOnly) === 0) {
            return 0;
          }
        }
        return 1;
      }
      return 0;
    },

    power : function(pwr, sterm) {
      if(pwr !== 0) {
        this.coeff = Math.pow(this.coeff, pwr);
        for(var i = 0; i < this.terms.length; i++) {
          this.terms[i].power(pwr, sterm);
        }
        this.pwr = 1;
        return this;
      }
      return null;
    },

    simplify : function(sterm) {
      var terms = this.terms;
      this.terms = [];
      for(var i = 0; i < terms.length; i++) {
        terms[i] = terms[i].simplify(sterm);
        if(terms[i] && (terms[i].var || terms[i].terms || terms[i].coeff !== 1 || terms[i].pwr !== 1)) {
          if(!terms[i].var && !terms[i].terms) this.coeff *= terms[i].coeff;
          else this.addTerm(terms[i]);
        }
      }
      if(this.terms.length === 0) return new Term({coeff : this.coeff});

      var t = this.condense(),
          mts = [], stm = new TermMultiply({terms : []}), bt = null;
      if(!t.terms) return t;
      for(var i = 0; i < t.terms.length; i++) {
        if(t.terms[i].type === 0 || t.terms[i].pwr !== 1 || t.terms[i].hasSTerm(sterm) === 0) {
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

        bt.multiply(stm, sterm);
      }

      for(var i = 0; i < mts.length; i++) {
        bt.multiply(mts[i], sterm);
      }

      //bt.coeff = this.coeff;
      bt = bt.simplify(sterm);
      if(bt.terms.length === 1) {
        bt.terms[0].coeff *= bt.coeff;
        return bt.terms.pop();
      }
      if(bt.terms.length === 0) return null;

      return bt;
    },

    condense : function() {
      this.sortAndStringify();
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
          if(terms[i]) {
            this.addTerm(terms[i]);
            this.coeff *= terms[i].coeff;
            terms[i].coeff = 1;
          }
        }
      }
      if(terms[terms.length - 1] !== 0) this.addTerm(terms[terms.length - 1]);
      if(this.terms.length === 1) {
        this.terms[0].coeff *= this.coeff;
        return this.terms.pop();
      }
      if(this.terms.length === 0) return null;
      return this;
    },

    multiply : function(term, sterm) {
      if(term.type === 2) return term.multiply(this, sterm);
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

    segregate : function(term, pwr) {
      var t = null;
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].var === term.var && (!pwr || this.terms[i].pwr >= pwr)) {
          if(pwr && this.terms[i].pwr > pwr) {
            t = this.terms[i].copy();
            t.pwr = pwr;
            t.coeff = 1;
            this.terms[i].pwr -= pwr;
          }
          else {
            t = this.terms[i];
            this.terms.splice(i, 1);
          }
          break;
        }
      }
      return [t, this];
    },

    hasSTerm : function(sterm) {
      if(!sterm) return 1;
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].hasSTerm(sterm) === 1) return 1;
      }
      return 0;
    },

    convertToString : function () {
      var str = (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"");
      for(var i = 0; i < this.terms.length; i++) {
        var s = this.terms[i].convertToString();
        if(s != "1") str += ""+s;
      }
      if(this.pwr && this.pwr !== 1) str += "^"+this.pwr;
      return str;
    },

    factorize : function(sterm) {
      for(var i = 0; i < this.terms.length;) {
        var rett = this.terms[i].factorize(sterm);
        if(this.terms[i].type === 2) {
          if(rett.type !== 2) {
            this.terms.splice(i, 1);
            this.addTerm(rett);
          }
          else {
            this.terms[i] = rett;
            i++;
          }
        }
        else {
          this.terms[i] = rett;
          i++;
        }
      }
      return this;
    },

    getVars : function(varRef) {
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i].getVars(varRef);
      }
    },

    getCode : function () {
      var str = (this.coeff && this.coeff !== 1 ? this.coeff+"*":"");
      for(var i = 0; i < this.terms.length; i++) {
        var s = this.terms[i].getCode();
        if(s != "1") {
          str += ""+s;
          if(this.terms.length > 1 && i < this.terms.length - 1) str += "*";
        }
      }
      if(this.pwr && this.pwr !== 1) str = "Math.pow(" + str +", " + this.pwr + ")";
      return str;
    },

    sortAndStringify : function() {
      this.fullStr = (this.coeff && this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")": this.coeff):"");
      this.sortStr = "";
      for(var i = 0; i < this.terms.length; i++) {
        this.terms[i].sortAndStringify();
      }
      this.terms.sort(TermBracket.sort_fun);
      for(var i = 0; i < this.terms.length; i++) {
        if(this.terms[i].fullStr != "1") this.sortStr += this.terms[i].fullStr;
      }
      if(this.pwr && this.pwr !== 1) this.sortStr += "^"+this.pwr;
      this.fullStr += this.sortStr;
    },

  });


  
  function Eqn(config) {
    Eqn.parent.call(this, config);

    this.vars = {};
    if(this.equationString) this.parseStr(this.equationString);
  }
  window.Eqn = Eqn;
  inherit(Base, Eqn, {

    parseStr : function(str) {
      str = str.replace(/\s+/g, " ");
      str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
      str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
      str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");

      this.equation = new TermBracket({terms : []}).parse(new Tokens(str.split(" ")));
    },

    simplify : function(sterm) {
      this.equation = this.equation.simplify(sterm);
      //this.equation.sortAndStringify();
    },

    replace : function(term, withTerm, sterm) { //sterm = term to segregate
      this.equation = this.equation.replace(term, withTerm);
      //this.simplify(sterm);
    },

    segregate : function(term) {
      var s;
      this.segregated = this.equation.copy();
      s = this.segregated.segregate(term, null);
      //this.segregated = this.segregated.factorize(term);
      //this.segregated.sortAndStringify();
      //if(s.length) return s[1];
      //else return s;
    },

    convertToString : function() {
      return this.equation.convertToString();
    },

    factorize : function(sterm) {
      this.segregated.factorize(sterm);
    },

    getVars : function(unknowns) {
      this.varRef = {};
      if(this.segregated) this.segregated.getVars(this.varRef);
      else this.equation.getVars(this.varRef);
      this.unknowns = {};
      this.hasUnknowns = 0;
      for(var v in this.varRef) {
        if(unknowns[v]) {
          this.unknowns[v] = 1;
          this.hasUnknowns = 1;
        }
      }
    },

    getCode : function() {
      return this.segregated.getCode();
    },

    copy : function() {
      var eqn =  new Eqn({equation : this.equation.copy()});
      eqn.vars = this.vars;
      eqn.varRef = this.varRef;
      eqn.unknowns = this.unknowns;
      eqn.hasUnknowns = this.hasUnknowns;
      eqn.equationString = this.equationString;
      return eqn;
    },

    sortAndStringify : function() {
      (this.segregated || this.equation).sortAndStringify();
    },

    getSortedStr : function() {
      return (this.segregated || this.equation).fullStr;
    },

  });

  window.Term = Term;
  window.TermBracket = TermBracket;
  window.TermMultiply = TermMultiply;

})();
