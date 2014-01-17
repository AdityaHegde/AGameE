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

  window.EqnSolver = {
    solve_single_var_master : function(eqns, mainTerm, mainEqn, unknowns, lhsVars, varsUsed) {
      var vars = [], mainVars = mainEqn.varRef, code = "", lhsVars1 = [];
      mainEqn = mainEqn.segregated || mainEqn.equation;
      for(var i = 0; i < eqns.length; i++) {
        if(eqns[i] !== 0) {
          vars.push(eqns[i].varRef);
          lhsVars1.push(lhsVars[i].copy());
        }
        else {
          vars.push(0);
        }
      }
      if(!mainVars[mainTerm.var]) {
        code = "var "+mainTerm.getCode()+"="+mainEqn.getCode()+";";
      }
      else if(mainVars[mainTerm.var][2]) {
        var c = [new TermBracket({terms : []}), new TermBracket({terms : []}), new TermBracket({terms : []})];
        for(var i = 0; i < mainEqn.terms.length; i++) {
          if(mainEqn.terms[i].hasSTerm(mainTerm)) {
            if(mainEqn.terms[i].type === 0) {
              c[mainEqn.terms[i].pwr].coeff = mainEqn.terms[i].coeff;
              c[mainEqn.terms[i].pwr].addTerm(new Term({coeff : 1}));
            }
            else {
              var pwr, terms = [];
              for(var j = 0; j < mainEqn.terms[i].terms.length; j++) {
                if(mainEqn.terms[i].terms[j].type === 0 && mainEqn.terms[i].terms[j].var === mainTerm.var) {
                  pwr = mainEqn.terms[i].terms[j].pwr;
                }
                else {
                  terms.push(mainEqn.terms[i].terms[j]);
                }
              }
              for(var j = 0; j < terms.length; j++) c[pwr].addTerm(terms[j]);
              c[pwr].coeff = mainEqn.terms[i].coeff;
            }
          }
          else {
            c[0].addTerm(mainEqn.terms[i]);
          }
        }
        if(!varsUsed.c2) code += "var ";
        code += "c0="+c[0].getCode()+",c1="+c[1].getCode()+",c2="+c[2].getCode()+"," +
                "a=c1*c1-4*c0*c2;if(a<0||c1===0) return result;a=Math.sqrt(a);var "+mainTerm.getCode()+"1=(-c1+2*a)/c0,"+mainTerm.getCode()+"2=(-c1-2*a)/c0;";
        varsUsed.c0 = 1;
        varsUsed.c1 = 1;
        varsUsed.c2 = 1;
        var codes = [];
        delete unknowns[mainTerm.var];
        while(true) {
          var solvables = [];
          for(var i = 0; i < vars.length; i++) {
            if(vars[i] === 0) continue;
            var unkns = 0, unkn;
            for(var v in vars[i]) {
              if(unknowns[v]) {
                unkns++;
                unkn = v;
              }
            }
            if(unkns === 0) {
              solvables.push(i);
            }
          }
          if(solvables.length === 0) break;
          for(var j = 0; j < solvables.length; j++) {
            var mainEqn1 = eqns[solvables[j]],
                mainTerm1 = lhsVars1[solvables[j]];
            eqns[solvables[j]] = 0;
            lhsVars[solvables[j]] = 0;
            vars[solvables[j]] = 0;
            delete unknowns[mainTerm1.var];
            if(!mainEqn1.segregated) mainEqn1.segregate(mainTerm1);
            mainEqn1.getVars(unknowns);
            codes.push(window.EqnSolver.solve_single_var_master(eqns, mainTerm1, mainEqn1, unknowns, lhsVars, varsUsed));
          }
        }
        if(codes.length > 0) {
          for(var i = 0; i < 2; i++) {
            code += mainTerm.var+"="+mainTerm.var+(i+1)+";";
            for(var j = 0; j < codes.length; j++) {
              code += codes[j];
            }
            code += "result.push("+mainTerm.var+");";
          }
        }
      }
      else if(mainVars[mainTerm.var][1]) {
        code = "var "+mainTerm.getCode()+"="+mainEqn.getCode()+";";
      }
      else {
      }
      return code;
    },
  };


})();
