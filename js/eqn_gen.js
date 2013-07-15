(function(){

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

		if(this.equationStrings) {
			for(var i = 0; i < this.equationStrings.length; i++) {
				var eqn = new Eqn({equationString : this.equationStrings[i]});
				this.equations.push(eqn);
				for(var v in eqn.vars) {
					this.vars[v] = this.vars[v] || [];
					this.vars[v].push(i);
				}
			} 
		}
	}
	inherit(Base, EqnGen, {

		simplify : function() {
			for(var i = 0; i < this.equationStrings.length; i++) {
				this.equations[i].simplify();
			}
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
			this.cur -= c;
		},
	});


	function Term(config) {
		Term.parent.call(this, config);

		this.pwr = this.pwr || 1;
		if(this.terms) {
			this.type = "bracketed";
			
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
				if(this.pwr) this.pwr = -this.pwr;
			}
		}
	}
	Term.sortFun = function(a, b) {
		if(a.terms || b.terms) return 0;
		else if(a.var === b.var) return 0;
		else if(a.var < b.var) return 1;
		else if(a.var > b.var) return -1;
		return 0;
	};
	inherit(Base, Term, {

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

		addTerm : function(term) {
			this.terms.push(term);
		},

		power : function(terms, pwr) {
			var ts = [];
			if(pwr !== 0) {
				if(terms) {
					var st = terms.pop(), mt = (terms.length === 1 ? terms.pop() : new Term({terms : terms})),
							ncr = 1;
					for(var i = 0; i <= pwr; i++) {
						var sti = st.copy(), mti = mt.copy();
						sti = sti.power((sti.terms ? sti.terms : null), pwr - i);
						mti = mti.power((mti.terms ? mti.terms : null), i);
						//mti.simplify();
						var ct = new TermMultiply({terms : [], coeff : ncr});
						for(var j = 0; j < sti.length; j++) {
							if(sti[j].pwr > 0) ct.addTerm(sti[j]);
						}
						for(var j = 0; j < mti.length; j++) {
							if(mti[j].pwr > 0) ct.addTerm(mti[j]);
						}
						if(ct.terms.length > 1) {
							ts.push(ct);
						}
						else {
							ct.terms[0].coeff *= ct.coeff;
							ts.push(ct.terms[0]);
						}
						ncr *= (pwr - i)/(i + 1);
					}
				}
				else {
					this.pwr = (this.pwr ? this.pwr * pwr : pwr);
					this.coeff = Math.pow(this.coeff, pwr);
					ts = [this];
				}
			}
			return ts;
		},

		simplify : function() {
			if(this.terms) {
				if(this.pwr !== 1) {
					this.terms = this.power(this.terms, this.pwr);
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
		},

		multiply : function(term) {
			var t = TermMultiply({terms : [this]});
			return t.multiply(term);
		},

		copy : function() {
			var c;
			if(this.terms) {
				c = new Term({coeff : this.coeff, pwr : this.pwr, terms : []});
				for(var i = 0; i < this.terms.length; i++) {
					c.addTerm(this.terms[i].copy());
				}
			}
			else {
				c = new Term({coeff : this.coeff, var : this.var, pwr : this.pwr, op : this.op});
			}
			return c;
		},

		convertToString : function () {
			var str = "";
			if(this.terms) {
				str = "(";
				for(var i = 0; i < this.terms.length; i++) {
					var s = this.terms[i].convertToString()
					//if(i === 0) s = s.substr(1);
					str += s;
					if(i < this.terms.length - 1) str += "+";
				}
				str += ")";
			}
			else {
				str = (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"") + this.var + (this.pwr !== 1 ? "^"+this.pwr : "");
			}
			return str;
		},

	});


	function TermMultiply(config) {
		TermMultiply.parent.call(this, config);

		this.type = "multiTerm";
		this.terms = config.terms;
		this.terms.sort(TermMultiply.sortFun);

		this.coeff = this.coeff || 1;
		for(var i = 0; i < this.terms.length; i++) {
			this.coeff *= this.terms[i].coeff;
			this.terms[i].coeff = 1;
		}
	}
	inherit(Term, TermMultiply, {

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

		simplify : function() {
			var ts = [], sts = [], mts = [], stm = new TermMultiply({terms : []});
			for(var i = 0; i < this.terms.length; i++) {
				if(!this.terms[i].type) {
					//sts.push(this.terms[i]);
					stm.addTerm(this.terms[i]);
				}
				else {
					mts.push(this.terms[i]);
				}
			}
			if(stm.terms.length === 0) {
				var tmpMts = mts.shift(),
				    tmpMtsS = tmpMts.simplify();
				
				for(var i = 0; i < tmpMtsS.length; i++) {
					if(tmpMtsS[i].type && tmpMtsS[i].type !== "multiTerm") {
						ts.push(new TermMultiply({terms : [tmpMtsS[i]]}));
					}
					else {
						ts.push(tmpMtsS[i]);
					}
				}
			}
			else {
				ts = [stm];
			}
			if(mts.length > 0) {
				for(var i = 0; i < mts.length; i++) {
					var tsb = mts[i].simplify(), tst = [];
					for(var j = 0; j < ts.length; j++) {

						for(var k = 0; k < tsb.length; k++) {
							var tm = new TermMultiply({terms : [ts[j].copy()]});
							tm.multiply(tsb[k]);
							if(tm.terms.length > 1) {
								tst.push(tm);
							}
							else {
								tm.terms[0].coeff *= tm.coeff;
								tst.push(tm.terms[0]);
							}
						}
					}
					ts = tst;
				}
			}
			else {
				ts = [this];
			}
			return ts;
		},

		multiply : function(term) {
			var ts = (term.terms ? term.terms:[term]);
			for(var i = 0; i < ts.length; i++) {
				this.addTerm(ts[i]);
			}
			this.coeff *= term.coeff;
			return this;
		},

		convertToString : function () {
			var str = (this.coeff !== 1 ? (this.coeff < 0 ? "("+this.coeff+")":this.coeff):"");
			for(var i = 0; i < this.terms.length; i++) {
				var s = this.terms[i].convertToString()
				//if(i === 0) s = s.substr(1);
				str += s;
				//if(i < this.terms.length - 1) str += "*";
			}
			return str;
		},

	});


	var operators = {
		'+' : 1,
		'-' : 1,
		'*' : 1,
		'/' : 1,
	};
	
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
							t = tokens.next();
							nt.pwr = Number(t);
							t = tokens.next();
						}
						if(operators[t]) {
							op = t;
							if(op === "*" || op === "/") {
								mt = new TermMultiply({terms : [nt]});
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
		},

		parseStr : function(str) {
			str = str.replace(/\s+/g, " ");
			str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
			str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
			str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");

			this.equation = new Term({terms : this.parseTokens(new Tokens(str.split(" ")), 1)});
		},

		simplify : function() {
			this.equation = new Term({terms : this.equation.simplify()});
		},

		convertToString : function() {
			/*var str = "";
			for(var i = 0; i < this.equation.length; i++) {
				str += this.equation[i].convertToString();
			}
			return str;*/
			return this.equation.convertToString();
		},

	});

})();
