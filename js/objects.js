(function(){

  /* Render - Feature
  /* Feature to handle all the rendering parts like shape of objects, position etc  */

  function Render(config) {
    Render.parent.call(this, config);

    if(config) {
      this.components.push(new Transform(config.transform));
      this.components.push(new Texture(config.texture));
      this.components.push(new Object(config.object));
    }

  }
  AGameE.Render = Render;
  AGameE.inherit(AGameE.Feature, Render, {
    animate : function(elapsed) {
      Render.parent.prototype.animate.call(this, elapsed);
    },

    draw : function(gl) {
      Render.parent.prototype.draw.call(this, gl);
    },

    getPos : function() {

/* TODO : support multiple Transform objects and search for transform objects */
/* TODO : calculate centroid rather that translate pos */

      return this.component[0].translate;

    },

    getDimension : function() {

      var d = {};

      for(var c = this.components.length - 1; c >= 0; c--) {
        if(this.components[c].getDimension) this.components[c].getDimension(d);
      }

      return d;

    },

    type : 'Render',

  });

  var objects, id = 0;

  /* Texture - Component
  /* */

  function Texture(config) {
    Texture.parent.call(this, config);

    this.id = "TEX" + id++;
  }
  AGameE.Texture = Texture;
  AGameE.inherit(AGameE.Component, Texture, {

    init : function() {
      this.texture = gl.createTexture();
      this.texture.image = new Image();
      var tex = this;
      this.texture.image.onload = function() {
        tex.initTexture();
      };
      this.texture.image.src = this.imageSrc;
    },

    initTexture : function() {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.texture.image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },

    draw : function(gl) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(shaderProgram.samplerUniform, 0);
    },

  });


  /* Transform - Component
  /* */

  function Transform(config) {
    Transform.parent.call(this, config);

    this.id = "TRN" + id++;
  };
  AGameE.Transform = Transform;
  AGameE.inherit(AGameE.Component, Transform, {

    init : function() {
      /* scale - no scale or single float or an array */
      if(this.scale && !this.scale.length) this.scale = [this.scale, this.scale, this.scale];

      var obj = this;
      this.feature.entity.listen("move", function(data) {
        obj.translate = data.newPos;
      });
    },

    draw : function(gl) {
      this._transform(mvMatrix);
    },

    getDimension : function(d) {
      objects[this.feature.shape].transformDimension(this, d);
    },

    _transform : function(mat) {
      if(this.translate) {
        mat4.translate(mat, this.translate);
      }

      if(this.rotate) {
        mat4.rotate(mat, degToRad(this.rotate[0]), [1, 0, 0]);
        mat4.rotate(mat, degToRad(this.rotate[1]), [0, 1, 0]);
        mat4.rotate(mat, degToRad(this.rotate[2]), [0, 0, 1]);      
      }

      if(this.scale) {
        mat4.scale(mat, this.scale);
      }
    },

  });


  /* Object - Component
  /* */

  function Object(config) {
    Object.parent.call(this, config);

    this.id = "OBJ" + id++;
  }
  AGameE.Object = Object;
  AGameE.inherit(AGameE.Component, Object, {

    init : function() {
      Object.parent.prototype.init.call(this);

      if(this.shape) {
        this.feature.shape = this.shape;
        if(!objects[this.shape].data) {
          objects[this.shape].data = objects[this.shape].create();
        }
        this.vertices = objects[this.shape].data.vertices;
        this.normal = objects[this.shape].data.normal;
        this.texCoords = objects[this.shape].data.texCoords;
        this.indices = objects[this.shape].data.indices;
      }

      this.vertexPosBuffer = AGameE.createBuffer(this.vertices, 'array', 3, this.vertices.length/3);

      if(this.colors) this.vertexColorBuffer = AGameE.createBuffer(this.colors, 'array', 4, this.colors.length/4);

      this.vertexNormalBuffer = AGameE.createBuffer(this.normal, 'array', 3, this.normal.length/3);

      if(this.texCoords) {
        this.vertexTexCoordBuffer = AGameE.createBuffer(this.texCoords, 'array', 2, this.texCoords.length/2);
      }

      this.vertexIndexBuffer = AGameE.createBuffer(this.indices, 'elem_array', 1, this.indices.length);
    },

    animate : function(elapsed) {
    },

    draw : function(gl) {
      if(Object.parent.prototype.draw) Object.parent.prototype.draw.call(this, gl);

      AGameE.pushMatrix();

      AGameE.bindBuffer(this.vertexPosBuffer, 'position');
      if(this.vertexColorBuffer) AGameE.bindBuffer(this.vertexColorBuffer, 'color');
      AGameE.bindBuffer(this.vertexNormalBuffer, 'normal');
      if(this.vertexTexCoordBuffer) {
        AGameE.bindBuffer(this.vertexTexCoordBuffer, 'texture');
      }

      AGameE.setupAmbientColor(this.config.ambientColor);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
      AGameE.setMatrixUniforms();
      gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
      AGameE.popMatrix();
    },

    getDimension : function(d) {
      objects[this.shape].getDimension(this, d);
    },

    type : 'Render',


  });

  /* DummyRender - Feature
  /* Object to simulate size only */

  function DummyRender(config) {
    Render.parent.call(this, config);

    this.components.push(new Transform(config.transform));
    this.components.push(new NoDisp({}));

  }
  AGameE.DummyRender = DummyRender;
  AGameE.inherit(AGameE.Render, DummyRender, {
  }); 

  /* NoDispC - Component
  /* Object to simulate size and not display anything */

  function NoDisp(config) {
    NoDisp.parent.call(this, config);

    this.id = "NDP" + id++;
  }
  AGameE.NoDisp = NoDisp;
  AGameE.inherit(AGameE.Object, NoDisp, {

    init : function() {
      this.shape = 'sphere';
      this.feature.shape = 'sphere';
    },

    draw : function(gl) {
    },

  });

  objects = {

    cube : {
      create : function() {
        return {
          vertices : [1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, 1,
                      -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1],
          normal : [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1,
                    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0],
          texCoords : [1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0],
          indices : [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23],
        };
      },

      getDimension : function(obj, d) {

        d.f = d.f || [];

        var i = 0, j = 0, lastNormal;
        for(var n = 0; n < obj.normal.length; n += 3) {
          var normal = [obj.normal[n], obj.normal[n+1], obj.normal[n+2]];
          if(lastNormal && Math.abs(vec3.length(vec3.subtract(normal, lastNormal, []))) > 0.0001) {
            var face = {v : [], n : lastNormal};
            for(var k = j; k < i; k++) {
              face.v.push([obj.vertices[3*k], obj.vertices[3*k + 1], obj.vertices[3*k + 2]]);
            }
            d.f.push(face);
            j = i;
          }
          i++;
          lastNormal = normal;
        }
        if(lastNormal) {
          var face = {v : [], n : lastNormal};
          for(var k = j; k < i; k++) {
            face.v.push([obj.vertices[3*k], obj.vertices[3*k + 1], obj.vertices[3*k + 2]]);
          }
          d.f.push(face);
        }

      },

      transformDimension : function(obj, d) {

        var mat = mat4.identity([]), nmat = [];
        obj._transform(mat);
        mat4.toInverseMat3(mat, nmat);
        mat3.transpose(nmat);
        nmat = mat3.toMat4(nmat);
        nmat[15] = 0;

        for(var f in d.f) {
          for(var v in d.f[f].v) {
            mat4.multiplyVec3(mat, d.f[f].v[v]);
          }
          mat4.multiplyVec3(nmat, d.f[f].n);
          vec3.normalize(d.f[f].n);
        }

      },

    },

    sphere : {
      create : function() {
        var s = 30, r = 1.0,
            vertices = [], normal = [], indices = [], texCoords = [], colors = [],
            as = 360/s,
            tv = as, th = 0.0,
            x1, y1 = r, z1, x2, y2 = r * Math.cos(degToRad(tv)), z2,
            rz = r * Math.sin(degToRad(tv)),
            lastVertices = [], i = 0;

        for(var zi = 0; zi < s; zi++) {
          x1 = rz * Math.sin(degToRad(zi * as));
          z1 = rz * Math.cos(degToRad(zi * as));
          x2 = rz * Math.sin(degToRad((zi + 1) * as));
          z2 = rz * Math.cos(degToRad((zi + 1) * as));
          vertices.push(x1, y2, z1, 0.0, y1, 0.0, x2, y2, z2);
          var n = vec3.normalize([x1, y2, z1]);
          normal.push(n[0], n[1], n[2]);
          n = vec3.normalize([0.0, y1, 0.0]);
          normal.push(n[0], n[1], n[2]);
          n = vec3.normalize([x2, y2, z2]);
          normal.push(n[0], n[1], n[2]);
          texCoords.push(1.0, 0.0, 0.5, 1.0, 0.0, 1.0);
          indices.push(i, i+1, i+2);
          i += 3;
          lastVertices.push([x1, z1]);
        }
        lastVertices.push([x2, z2]);
        y1 = y2;
        for(var yi = 2; yi < s; yi++) {
          tv = yi * as;
          y2 = y1;
          y1 = r * Math.cos(degToRad(tv));
          rz = r * Math.sin(degToRad(tv));
        
          for(var zi = 0; zi < s; zi++) {
            x1 = rz * Math.sin(degToRad(zi * as));
            z1 = rz * Math.cos(degToRad(zi * as));
            x2 = rz * Math.sin(degToRad((zi + 1) * as));
            z2 = rz * Math.cos(degToRad((zi + 1) * as));
            vertices.push(x1, y1, z1, lastVertices[zi][0], y2, lastVertices[zi][1], lastVertices[zi + 1][0], y2, lastVertices[zi + 1][1], x2, y1, z2);
            var n = vec3.normalize([x1, y1, z1]);
            normal.push(n[0], n[1], n[2]);
            n = vec3.normalize([lastVertices[zi][0], y2, lastVertices[zi][1]]);
            normal.push(n[0], n[1], n[2]);
            n = vec3.normalize([lastVertices[zi + 1][0], y2, lastVertices[zi + 1][1]]);
            normal.push(n[0], n[1], n[2]);
            n = vec3.normalize([x2, y1, z2]);
            normal.push(n[0], n[1], n[2]);
            texCoords.push(1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0);
            indices.push(i, i+1, i+2, i, i+2, i+3);
            i += 4;
            lastVertices[zi] = [x1, z1];
          }
          lastVertices[lastVertices.length - 1] = [x2, z2];
        }
        y1 = -r;
        for(var zi = 0; zi < s; zi++) {
          x1 = lastVertices[zi][0];
          z1 = lastVertices[zi][1];
          x2 = lastVertices[zi+1][0];
          z2 = lastVertices[zi+1][1];
          vertices.push(x1, y2, z1, x2, y2, z2, 0.0, y1, 0.0);
          var n = vec3.normalize([x1, y2, z1]);
          normal.push(n[0], n[1], n[2]);
          n = vec3.normalize([0.0, y1, 0.0]);
          normal.push(n[0], n[1], n[2]);
          n = vec3.normalize([x2, y2, z2]);
          normal.push(n[0], n[1], n[2]);
          texCoords.push(1.0, 1.0, 1.0, 0.0, 0.5, 0.0);
          indices.push(i, i+1, i+2);
          i += 3;
        }

        return {
          vertices : vertices,
          normal : normal,
          texCoords : texCoords,
          indices : indices,
        };
      },

      getDimension : function(obj, d) {
        d.r = 1.0;
      },

      transformDimension : function(obj, d) {
        if(obj.scale) {
          d.r *= Math.max(obj.scale[0], obj.scale[1], obj.scale[2]);
        }
      },

    },

  };
  

})();
