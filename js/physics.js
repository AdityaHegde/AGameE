(function(){

  function APhyE(config) {
    APhyE.parent.call(this, config);
    this.bodies = this.bodies || [];

    this.e = this.e || 1;
    this.iters = this.iters || 1;
  }
  AGameE.APhyE = APhyE;
  AGameE.inherit(AGameE.Base, APhyE, {
    init : function(entities) {
    },

    animate : function(elapsed) {

      for(var b in this.bodies) {
        this.bodies[b].calculateMotion(elapsed);
      }

      for(var b in this.bodies) {
        
        for(var iters = 0; iters < this.iters; iters++) {
          if(!this.bodies[b].shape) {
            this.bodies[b].shape = this.bodies[b].entity.shape;
            this.bodies[b].body.shape = this.bodies[b].entity.shape;
          }
          if(this.bodies[b].fixedBody !== "true") {
            this.bodies[b].body.d.contacts = [];
            for(var cb in this.bodies) {
              if(cb !== b) this.bodies[b].testCollision(this.bodies[cb]);
            }
            this.bodies[b].resolveCollision();
          }
        }
      }

    },

    addBody : function(body) {
      this.bodies.push(body);
    },

    reflect : function(v, n) {
      return vec3.subtract(v, vec3.scale(n, (1 + this.e)*vec3.dot(v, n), []), []);
    },
  });

  phyE = phyE || new APhyE();

  /* Physx - Feature
  /* Feature to incorporate physics calculations to entity */

  function Physx(config) {
    Physx.parent.call(this, config);

    var body;
    if(this.motion || !this.fixedBody) {
      body = new RigidBody(config);
    }
    else {
      body = new FixedBody(config);
      this.fixedBody = "true";
    }
    this.components.push(body);
    this.body = body;
  }
  AGameE.Physx = Physx;
  AGameE.inherit(AGameE.Feature, Physx, {
    init : function() {
      Physx.parent.prototype.init.call(this);

      phyE.addBody(this);
    },

    calculateMotion : function(elapsed) {
      if(!this.d) this.d = this.entity.d;
      this.body.calculateMotion(elapsed);
    },

    testCollision : function(obj) {
      this.body.testCollision(obj.body);
    },

    resolveCollision : function() {
      this.body.resolveCollision();
    },

    type : 'Physx',
  });

  var id = 0, objectsMap = {

    polyhedron : {

    },

    sphere : {

      polyhedron : {

        testCollision : function(obj, dir) {
          var d = 1.00001;  //pti - intrsection point, ptr - reflection point
          for(var f in obj.d.f) {
            var face = obj.d.f[f], dn = vec3.dot(dir, face.n, []), rv = vec3.scale(face.n, this.d.r, []);  //rv - radius vector
            if(dn != 0) {
              var diff = vec3.subtract(vec3.add(face.v[0], rv, []), this.pos, []), nm = vec3.dot(diff, face.n, []), d1 = nm / dn;
              if(d1 < d && d1 >= 0) {
                var ptr = [], pti = [], dir = vec3.subtract(this.npos, this.pos, []),
                    rv = vec3.scale(face.n, this.d.r, []), isWithin = 1;
                vec3.add(this.pos, vec3.scale(dir, d1, ptr), ptr);
                vec3.add(ptr, vec3.negate(rv, []), pti);

                /* Check for face collision first */

                for(var v = 0; v < face.v.length; v++) {
                  var ni = (v+1)%face.v.length, 
                      v1 = vec3.subtract(face.v[ni], face.v[v], []), v2 = vec3.subtract(pti, face.v[v], []), v3 = vec3.subtract(face.v[(v+2)%face.v.length], face.v[v], []),
                      v11 = vec3.normalize(vec3.cross(v1, v2, [])), v12 = vec3.normalize(vec3.cross(v1, v3, []));
                  if(Math.abs(v11[0] - v12[0]) > 0.00001 || Math.abs(v11[1] - v12[1]) > 0.00001 || Math.abs(v11[2] - v12[2]) > 0.00001) {
                    isWithin = 0;

                    /* Check for collision with edge */

                    var dd = line.perpPointFromLine(dir, this.pos, v1, face.v[ni], this.d.r), pdd, dd1, pdd1, pter, ptei = 0;
                    for(var i in dd) {
                      if(dd[i][0] >= 0.0 && dd[i][0] <= 1.0 && (!pdd || pdd > dd[i][0])) {
                        pter = dd[i][1];
                        dd1 = line.perpPointFromPoint(v1, face.v[ni], dd[i][0]);
                        if(dd1[0] >= 0.0 && dd1[0] <= 1.0) {
                          pdd = dd[i][0];
                          ptei = dd[i][1];
                          break;
                        }
                      }
                    }

                    if(ptei) {
                      var normPt = line.perpPointFromPoint(v1, face.v[ni], obj.d.c), norm = vec3.normalize(vec3.subtract(normPt, obj.d.c, []));
                      heap.insert(this.d.contacts, [pdd, norm, pter, ptei], RigidBody.comparator);
                    }
                    else {

                    }

                    break;
                  }
                }

                if(isWithin === 1) {
                  heap.insert(this.d.contacts, [d1, face.n, ptr, pti], RigidBody.comparator);
                }
              }
            }
          }
        },

        resolveCollision : function() {

          var c = heap.delete(this.d.contacts, RigidBody.comparator);
          while(c[0] !== "null") {
            var dir = vec3.subtract(this.npos, this.pos, []),
                ndir = phyE.reflect(dir, c[1]);
            vec3.normalize(ndir);
            vec3.add(c[2], vec3.scale(ndir, (1 - c[0])*vec3.length(dir)), this.npos);
            this.pos = c[2];

            if(vec3.length(this.motion.v) > 0.0) this.motion.v = phyE.reflect(this.motion.v, c[1]);

            break;

            //c = heap.delete(this.d.contacts, RigidBody.comparator);
          }
          
        },

      },

    },

  };

  /* RigidBody - Component
  /* Component that stores rigid body and its features */

  function RigidBody(config) {
    RigidBody.parent.call(this, config);
    this.id = id++;

    if(!this.motion) this.motion = { v : [0.0, 0.0, 0.0], a : [0.0, 0.0, 0.0] };

    if(!this.pos) this.pos = [0.0, 0.0, 0.0];

    this.motion.tv = [0.0, 0.0, 0.0];
  }
  AGameE.RigidBody = RigidBody;
  RigidBody.comparator = function(a, b) {
    return a[0] - b[0];  //min heap
  };
  AGameE.inherit(AGameE.Component, RigidBody, {
    init : function() {
      RigidBody.parent.prototype.init.call(this);
    },

    calculateMotion : function(elapsed) {
      if(!this.d) this.d = this.feature.d;
      this.npos = [];
      vec3.add(this.motion.v, vec3.scale(this.motion.a, elapsed/1000, []));
      vec3.add(this.pos, vec3.scale(this.motion.v, elapsed/1000, []), this.npos);
      vec3.add(this.npos, vec3.scale(this.motion.tv, elapsed/1000, []), this.npos);
      this.motion.tv = [0.0, 0.0, 0.0];
    },

    testCollision : function(obj) {
      var dir = vec3.subtract(this.npos, this.pos, []);
      if(vec3.length(dir) <= 0.000001) return;
      objectsMap[this.shape][obj.shape].testCollision.call(this, obj, dir);
    },

    resolveCollision : function() {
      var c = heap.delete(this.d.contacts, RigidBody.comparator);
      while(c[0] !== "null") {
        var dir = vec3.subtract(this.npos, this.pos, []),
            ndir = phyE.reflect(dir, c[1]);
        vec3.normalize(ndir);
        vec3.add(c[2], vec3.scale(ndir, (1 - c[0])*vec3.length(dir)), this.npos);
        this.pos = c[2];

        if(vec3.length(this.motion.v) > 0.0) this.motion.v = phyE.reflect(this.motion.v, c[1]);

        break;

        //c = heap.delete(this.d.contacts, RigidBody.comparator);
      }
    },

    animate : function() {
      if(this.npos) {
        this.fire("move", {newPos : this.npos, oldPos : this.pos});
        this.pos = this.npos;
      }
    },

    draw : function() {
      //mat4.translate(mvMatrix, this.pos);
    },

  });


  /* FixedBody - Component
  /* Component that defines a fixed body */

  function FixedBody(config) {
    FixedBody.parent.call(this, config);
    this.id = id++;
  }
  AGameE.FixedBody = FixedBody;
  AGameE.inherit(AGameE.Component, FixedBody, {
    init : function() {
      FixedBody.parent.prototype.init.call(this);
    },

    calculateMotion : function(elapsed) {
      if(!this.d) this.d = this.feature.d;
    },

    testCollision : function(obj) {},

    resolveCollision : function() {},
  });


})();
