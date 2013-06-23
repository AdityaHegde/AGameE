var 
engineData = {
  world : [],
},
gl,
shaderProgram,
phyE,
mvMatrix = mat4.create(),
mvMatrixStack = [],
pMatrix = mat4.create(),
lastTime = 0;

(function() {

  engineData.WEBGL_TAG = "experimental-webgl";

  engineData.FRAGMENT_SHADER = " \
    precision mediump float;\
    varying vec2 vTextureCoord;\
    varying vec3 vLightWeighting;\
    uniform sampler2D uSampler;\
    void main(void) {\
      vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\
      gl_FragColor = vec4(textureColor.rgb * vLightWeighting, textureColor.a);\
    }";

  engineData.VERTEX_SHADER = " \
    attribute vec3 aVertexPosition;\
    attribute vec3 aVertexNormal;\
    attribute vec2 aTextureCoord;\
    uniform mat4 uMVMatrix;\
    uniform mat4 uPMatrix;\
    uniform mat3 uNMatrix;\
    uniform vec3 uAmbientColor;\
    uniform vec3 uPointLightingLocation;\
    uniform vec3 uPointLightingColor;\
    varying vec2 vTextureCoord;\
    varying vec3 vLightWeighting;\
    void main(void) {\
      vec4 mvPosition = uMVMatrix * vec4(aVertexPosition, 1.0);\
      gl_Position = uPMatrix * mvPosition;\
      vTextureCoord = aTextureCoord;\
      vec3 lightDirection = normalize(uPointLightingLocation - mvPosition.xyz);\
      vec3 transformedNormal = uNMatrix * aVertexNormal;\
      float directionalLightWeighting = max(dot(transformedNormal, lightDirection), 0.0);\
      vLightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;\
    }";

  /* AGameE
  /* */

  window.AGameE = {
    currentlyPressedKeys : {},

    inherit : function(parent, child, members) {
      child.prototype = new parent();
      child.prototype.constructor = child;
      child.parent = parent;

      for(var m in members) {
        child.prototype[m] = members[m];
      }

      for(var m in parent.MEMBERS) {
        if(child.MEMBERS) {
          if(!child.MEMBERS[m]) child.MEMBERS[m] = parent.MEMBERS[m];
        }
      }
    },

    pushMatrix : function() {
      var copy = mat4.create();
      mat4.set(mvMatrix, copy);
      mvMatrixStack.push(copy);
    },

    popMatrix : function() {
      if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
      }
      mvMatrix = mvMatrixStack.pop();
    },

    setMatrixUniforms : function() {
      gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
      gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

      var normalMatrix = mat3.create();
      mat4.toInverseMat3(mvMatrix, normalMatrix);
      mat3.transpose(normalMatrix);
      gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
    },

    createBuffer : function(array, type, itemSize, numItems) {
      var bufferTypeMap = {
        array : {
          bufferType : 'ARRAY_BUFFER',
          bufferFun : Float32Array,
        },
        elem_array : {
          bufferType : 'ELEMENT_ARRAY_BUFFER',
          bufferFun : Uint16Array,
        },
      };
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl[bufferTypeMap[type].bufferType], buffer);
      gl.bufferData(gl[bufferTypeMap[type].bufferType], new bufferTypeMap[type].bufferFun(array), gl.STATIC_DRAW);
      buffer.itemSize = itemSize;
      buffer.numItems = numItems;
      return buffer;
    },

    bindBuffer : function(buffer, type) {
      var bufferTypeMap = {
        position : 'vertexPositionAttribute',
        color : 'vertexColorAttribute',
        normal : 'vertexNormalAttribute',
        texture : 'textureCoordAttribute',
      };

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(shaderProgram[bufferTypeMap[type]], buffer.itemSize, gl.FLOAT, false, 0, 0);
    },

    setupAmbientColor : function(ambientColor) {
      gl.uniform3f(shaderProgram.ambientColorUniform, ambientColor.r, ambientColor.g, ambientColor.b);
    },
  };
  document.onkeydown = function(event) {
    AGameE.currentlyPressedKeys[event.keyCode] = true;
  }
  document.onkeyup = function(event) {
    AGameE.currentlyPressedKeys[event.keyCode] = false;
  }

  /* Base
  /* */

  function Base(config) {
    for(var m in this.MEMBERS) {
      if(config[m]) this[m] = config[m];
      else this[m] = this.MEMBERS[m];
    }

    if(!this.MEMBERS && config) {
      for(var c in config) this[c] = config[c];
    }
    this.listener = {};
  }
  AGameE.Base = Base;
  Base.prototype.listen = function(event, callback, params) {
    this.listener[event] = this.listener[event] || [];
    this.listener[event].push([callback, params]);
  };
  Base.prototype.fire = function(event, data) {
    data = data || {};
    data.propogate = "true";
    for(var c in this.listener[event]) {
      if(this.listener[event][c][1]) data.params = this.listener[event][c][1];
      this.listener[event][c][0].call(this, data);
      delete data['params'];
    }
  };

  /* World
  /* */

  function World(config) {
    World.parent.call(this, config);
    engineData.world.push(this);
    this.config = config;
    this.scenes = (config && config.scenes) || [];
  }
  AGameE.World = World;
  AGameE.inherit(Base, World);
  function getShader(gl, shader_type) {
    var shader = gl.createShader(gl[shader_type]);

    gl.shaderSource(shader, engineData[shader_type]);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }
  World.prototype.init = function() {
    /* Canvas Init
    /* */
    var canvas = document.getElementById(this.config.canvasId);
    try {
      gl = canvas.getContext(engineData.WEBGL_TAG);
      gl.viewportWidth = canvas.width;
      gl.viewportHeight = canvas.height;
    } catch (e) {}
    if (!gl) {
      alert("Could not initialise WebGL, sorry :-(");
      return;
    }

    /* Shader Init
    /* */
    var fragmentShader = getShader(gl, "FRAGMENT_SHADER"),
        vertexShader = getShader(gl, "VERTEX_SHADER");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert("Could not initialise shaders");
      return;
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    //shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    //gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
    shaderProgram.pointLightingColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingColor");

    phyE = new AGameE.APhyE(this.physicsEngine || {});

    for(var s in this.scenes) {
      this.scenes[s].init();
    }
 
    /* Init Rendering and start animation
    /* */
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    this.animate();

    return this;
  };

  World.prototype.animate = function() {
    var world = this;
    requestAnimFrame(function() {world.animate()});

    var curTime = new Date().getTime();
    if(lastTime !== 0) {
      var elapsed = curTime - lastTime;

      phyE.animate(elapsed);

      for(var s in this.scenes) {
        this.scenes[s].animate(elapsed);
      }
    }
    lastTime = curTime;

    this.draw(gl);
  };

  World.prototype.draw = function(gl) {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(mvMatrix);

    for(var s in this.scenes) {
      AGameE.pushMatrix();
      this.scenes[s].draw(gl);
      AGameE.popMatrix();
    }
  };

  World.prototype.addScene = function(scene) {
    this.scenes.push(scene);
  };

  /* Scene
  /* */

  function Scene(config) {
    Scene.parent.call(this, config);
    this.entities = (config && config.entities) || [];
    this.config = config;

    var player = new Entity({
      features : [
        new AGameE.WASD({
          turnRate : 0.1,
          speed : 0.003,
        }),
        new AGameE.DummyRender({
          transform : {
            translate : this.playerPos,
            rotate : [0.0, 0.0, 0.0],
            scale : [0.2, 0.2, 0.2],
          },
        }),
        new AGameE.Physx({
          motion : this.motion || {
            v : [0.0, 0.0, 0.0], a : [0.0, 0.0, 0.0],
          },
          pos : this.playerPos,
        }), 
      ],
    });
    this.player = player;
    this.entities.push(player);
  }
  AGameE.Scene = Scene;
  AGameE.inherit(Base, Scene, {

    init : function() {
      for(var e in this.entities) {
        this.entities[e].scene = this;
        this.entities[e].init();
      }

      this.camera = new AGameE.Camera({
        pos : this.playerPos,
      });

      var obj = this;
      this.player.listen("WASD::move", function(data) {
        obj.camera.rotate(data.turn);
        mat4.multiplyVec3(obj.camera.dirMatrix, data.velocity);
        obj.player.featureLink.Physx.body.motion.tv = data.velocity;
      });
      this.player.listen("move", function(data) {
        obj.camera.move(data.newPos);
      });
    },

    animate : function(elapsed) {
      for(var e in this.entities) {
        this.entities[e].animate(elapsed);
      }
    },

    draw : function(gl) {
      this.camera.draw(gl);

      if(this.light) {
        gl.uniform3fv(shaderProgram.pointLightingLocationUniform, this.light.position);
        gl.uniform3fv(shaderProgram.pointLightingColorUniform, this.light.color);
      }

      for(var e in this.entities) {
        AGameE.pushMatrix();
        this.entities[e].draw(gl);
        AGameE.popMatrix();
      }
    },

    addEntity : function(entity) {
      this.entities.push(entity);
    },

    /*fire : function(event, data) {
      Scene.parent.prototype.fire.call(this, event, data);

      this.world.fire(event, data);
    },*/

  });

  /* Entity
  /* */

  var entityId = 0;

  function Entity(config) {
    Entity.parent.call(this, config);
    this.config = config;
    this.features = (config && config.features) || [];

    this.id = entityId++;
  }
  AGameE.Entity = Entity;
  AGameE.inherit(Base, Entity, {

    init : function() {
      this.featureLink = {};
      for(var f in this.features) {
        if(this.features[f].type) this.featureLink[this.features[f].type] = this.features[f];
        this.features[f].entity = this;
        this.features[f].init();
      }
      if(this.featureLink.Render) this.d = this.featureLink.Render.getDimension();
    },

    animate : function(elapsed) {
      for(var f in this.features) {
        this.features[f].animate(elapsed);
      }
    },

    revert : function(normal) {
      for(var f in this.features) {
        this.features[f].revert(normal);
      }
    },

    draw : function(gl) {
      AGameE.pushMatrix();
      for(var f in this.features) {
        this.features[f].draw(gl);
      }
      AGameE.popMatrix();
    },

    addFeature : function(feature) {
      this.features.push(feature);
    },

    fire : function(event, data) {
      Entity.parent.prototype.fire.call(this, event, data);

      this.scene.fire(event, data);
    },

  });

  /* Feature
  /* */

  function Feature(config) {
    Feature.parent.call(this, config);
    this.config = config;
    this.components = (config && config.components) || [];
  }
  AGameE.Feature = Feature;
  AGameE.inherit(Base, Feature, {

    init : function() {
      for(var c in this.components) {
        this.components[c].feature = this;
        this.components[c].init();
      }
    },

    animate : function(elapsed) {
      for(var c in this.components) {
        if(this.components[c].animate) this.components[c].animate(elapsed);
      }
    },

    revert : function(normal) {
      for(var c in this.components) {
        if(this.components[c].revert) this.components[c].revert(normal);
      }
    },

    draw : function(gl) {
      AGameE.pushMatrix();
      for(var c in this.components) {
        if(this.components[c].draw) this.components[c].draw(gl);
      }
      AGameE.popMatrix();
    },

    addComponent : function(component) {
      this.components.push(component);
    },

    fire : function(event, data) {
      Feature.parent.prototype.fire.call(this, event, data);

      this.entity.fire(event, data);
    },

  });

  /* Component
  /* */

  function Component(config) {
    Component.parent.call(this, config);
    this.config = config;
  }
  AGameE.Component = Component;
  AGameE.inherit(Base, Component, {

    init : function() {
    },

    /*animate : function(elapsed) {
    },

    draw : function(gl) {
    },*/

    fire : function(event, data) {
      Component.parent.prototype.fire.call(this, event, data);

      this.feature.fire(event, data);
    },

  });

  /* Camera - Misc
  /* */

  function Camera(config) {
    Camera.parent.call(this, config);
    this.turn = [0.0, 225.0, 0.0];
    this.dirMatrix = mat4.identity([]);
  };
  AGameE.Camera = Camera;
  AGameE.inherit(Base, Camera, {

    move : function(newPos) {
      this.pos = newPos;
    },

    rotate : function(turn) {
      this.turn[0] += turn[0];
      this.turn[1] += turn[1];
      this.turn[2] += turn[2];
      
      this.dirMatrix = mat4.identity([]);
      mat4.rotate(this.dirMatrix, degToRad(this.turn[0]), [1, 0, 0]);
      mat4.rotate(this.dirMatrix, degToRad(this.turn[1]), [0, 1, 0]);
      mat4.rotate(this.dirMatrix, degToRad(this.turn[2]), [0, 0, 1]);
    },

    draw : function(gl) {
      mat4.rotate(mvMatrix, degToRad(-this.turn[0]), [1, 0, 0]);
      mat4.rotate(mvMatrix, degToRad(-this.turn[1]), [0, 1, 0]);
      mat4.rotate(mvMatrix, degToRad(-this.turn[2]), [0, 0, 1]);
      mat4.translate(mvMatrix, [-this.pos[0], -this.pos[1], -this.pos[2]]);
    },

  });

  /* WASD - Feature
  /* WASD movement handler */

  function WASD(config) {
    this.turnRate = this.turnRate || 0.1;
    this.speed = this.speed || 0.5;
  };
  AGameE.WASD = WASD;
  AGameE.inherit(Feature, WASD, {

    animate : function(elapsed) {
      var velocity = [0, 0, 0], turn = [0, 0, 0], f = 0;
      if (AGameE.currentlyPressedKeys[37] || AGameE.currentlyPressedKeys[65]) {
        //Left or A, strafe left
        velocity[0] = -this.speed*elapsed;
        f = 1;
      } else if (AGameE.currentlyPressedKeys[39] || AGameE.currentlyPressedKeys[68]) {
        //Right or D, strafe right
        velocity[0] = this.speed*elapsed;
        f = 1;
      }

      if (AGameE.currentlyPressedKeys[38] || AGameE.currentlyPressedKeys[87]) {
        //Up or W
        velocity[2] = -this.speed*elapsed;
        f = 1;
      } else if (AGameE.currentlyPressedKeys[40] || AGameE.currentlyPressedKeys[83]) {
        //Down or S
        velocity[2] = this.speed*elapsed;
        f = 1;
      }

      if (AGameE.currentlyPressedKeys[81]) {
        //Q, turn left
        turn[1] = this.turnRate*elapsed;
        f = 1;
      } else if (AGameE.currentlyPressedKeys[69]) {
        //E, turn right
        turn[1] = -this.turnRate*elapsed;
        f = 1;
      }

      if (AGameE.currentlyPressedKeys[82]) {
        //R, look up
        turn[0] = this.turnRate*elapsed;
        f = 1;
      } else if (AGameE.currentlyPressedKeys[70]) {
        //F, look down
        turn[0] = -this.turnRate*elapsed;
        f = 1;
      }

      if (f === 1) {
        this.fire("WASD::move", { velocity : velocity, turn : turn });
      }

    },

  });

})();
