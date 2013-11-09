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
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.texture.image);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },

    draw : function(gl) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(shaderProgram.samplerUniform, 0);
    },

    type : "Texture",

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
      if(this.scale) {
        mat4.scale(mat, this.scale);
      }

      if(this.rotate) {
        mat4.rotate(mat, degToRad(this.rotate[0]), [1, 0, 0]);
        mat4.rotate(mat, degToRad(this.rotate[1]), [0, 1, 0]);
        mat4.rotate(mat, degToRad(this.rotate[2]), [0, 0, 1]);      
      }

      if(this.translate) {
        mat4.translate(mat, this.translate);
      }
    },

    type : "Transform",

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
        objects[this.shape].postInit.call(this);
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

    type : "Render",

  });

  /* DummyRender - Feature
  /* Object to simulate size only */

  function DummyRender(config) {
    /* Intended call thru Render */
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

    polyhedron : {
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
        d.e = d.e || [];
        d.v = d.v || [];

        function addEdge(edges, edge) {
          for(var e in edges) {
            if((vec3.length(vec3.subtract(edge[0], edges[e].v[0], [])) === 0 && vec3.length(vec3.subtract(edge[1], edges[e].v[1], [])) === 0) || 
               (vec3.length(vec3.subtract(edge[0], edges[e].v[1], [])) === 0 && vec3.length(vec3.subtract(edge[1], edges[e].v[0], [])) === 0)) {
              return;
            }
          }
          edges.push({v : [vec3.create(edge[0]),vec3.create(edge[1])], e : vec3.subtract(edge[1], edge[0], [])});
        }

        function addVertex(vertices, vertex) {
          for(var v in vertices) {
            if(vec3.length(vec3.subtract(vertex, vertices[v], [])) === 0) return
          }
          vertices.push(vec3.create(vertex));
        }

        var i = 0, j = 0, lastNormal;
        for(var n = 0; n < obj.normal.length; n += 3) {
          var normal = [obj.normal[n], obj.normal[n+1], obj.normal[n+2]];
          if(lastNormal && Math.abs(vec3.length(vec3.subtract(normal, lastNormal, []))) > 0.0001) {
            var face = {v : [], n : lastNormal}, lv, v;
            for(var k = j; k < i; k++) {
              lv = v;
              v = [obj.vertices[3*k], obj.vertices[3*k + 1], obj.vertices[3*k + 2]]
              face.v.push(v);
              if(d.e.length < 12 && lv) {
                addEdge(d.e, [v, lv]);
              }
              if(d.v.length < 8) {
                addVertex(d.v, v);
              }
            }
            d.f.push(face);
            j = i;
          }
          i++;
          lastNormal = normal;
        }
        if(lastNormal) {
          var face = {v : [], n : lastNormal}, lv, v;
          for(var k = j; k < i; k++) {
            lv = v;
            v = [obj.vertices[3*k], obj.vertices[3*k + 1], obj.vertices[3*k + 2]]
            face.v.push(v);
            if(d.e.length < 12 && lv) {
              addEdge(d.e, [v, lv]);
            }
            if(d.v.length < 8) {
              addVertex(d.v, v);
            }
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

        for(var e in d.e) {
          mat4.multiplyVec3(mat, d.e[e].v[0]);
          mat4.multiplyVec3(mat, d.e[e].v[1]);
          mat4.multiplyVec3(mat, d.e[e].e);
        }

        for(var v in d.v) {
          mat4.multiplyVec3(mat, d.v[v]);
        }

        d.c = obj.feature.componentLink.Transform.translate;

      },

      postInit : function() {
        var tex = [], rotateMat = [], mat = mat4.identity([]);
        for(var i = 0; i < this.texCoords.length; i += 2) {
          var v = [this.texCoords[i], this.texCoords[i + 1], (i < this.texCoords.length/2 ? 1:-1)], j = 3*i/2,
              nv = [this.normal[j], this.normal[j + 1], this.normal[j + 2]];
              rm = mat4.identity([]), rmi = mat4.identity([]);
          mat4.rotate(rm, vec3.angle([0, 0, 1], nv), vec3.cross([0, 0, 1], nv, []));
          mat4.inverse(rm, rmi);
          mat4.multiplyVec3(rm, v);
          tex.push(v);
          rotateMat.push(rmi);
        }
        mat4.scale(mat, vec3.scale(this.feature.componentLink.Transform.scale, 2, []));

        this.texCoords = [];
        for(var j in tex) {
          mat4.multiplyVec3(mat, tex[j]);
          mat4.multiplyVec3(rotateMat[j], tex[j]);
          this.texCoords.push(tex[j][0]);
          this.texCoords.push(tex[j][1]);
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


  /* Shape  -  Misc */
  /* Base for shapes */

  function Shape(config) {
    Shape.parent.call(this, config);
  }
  AGameE.Shape = Shape;
  AGameE.inherit(AGameE.Base, Shape, {

    create : function(obj) {
      if(!this.data) this.data = this.getAttributes(obj);
      return this.data
    },

    getAttributes : function(obj) {
      return {};
    },

    getDimension : function(obj, d) {
    },

    transformDimension : function(obj, d) {
    },

  }); 

  /* Polyhedron  -  Basic polyhedron with convex faces */

  function Polyhedron(config) {
    Polyhedron.parent.call(this, config);
  }
  AGameE.Polyhedron = Polyhedron;
  AGameE.inherit(AGameE.Shape, Polyhedron, {

    getAttributes : function(obj) {
      var vertices = [], normal = [], indices = [], lastI = 0;
      for(var faceI in obj.faces) {
        var face = obj.faces[faceI], lastVertices = [[],[],[]], v = 0, firstVertex = lastI;
        for(var vertexI in face) {
          var vertex = face[vertexI];
          lastVertices[v] = [];
          for(var c = vertex*3; c < vertex*3 + 3; c++) {
            vertices.push(obj.vertices[c]);
            if(obj.verticesAsNormals === "true") normal.push(obj.vertices[c]);

            lastVertices[v].push(obj.vertices[c]);
          }
          lastI++;
          v = (v + 1) % 3;
        }
        for(var idx = firstVertex + 2; idx < lastI; idx++) {
          indices.push(firstVertex, idx - 1, idx);
        }
        if(obj.verticesAsNormals !== "true") {
          var n = vec3.normalize(vec3.negate(vec3.cross(vec3.subtract(lastVertices[2], lastVertices[1]), vec3.subtract(lastVertices[1], lastVertices[0]))));
          for(var v = 0; v < face.length; v++) {
            for(var c = 0; c < 3; c++) {
              normal.push(n[c]);
            }
          }
        }
      }

      return {vertices : vertices, normal : normal, indices : indices, texCoords : obj.texCoords};
    },

    getDimension : function(obj, d) {

      d.f = d.f || [];
      d.e = d.e || [];
      d.v = d.v || [];

      function addEdge(edges, edge) {
        for(var e in edges) {
          if((vec3.length(vec3.subtract(edge[0], edges[e].v[0], [])) === 0 && vec3.length(vec3.subtract(edge[1], edges[e].v[1], [])) === 0) || 
             (vec3.length(vec3.subtract(edge[0], edges[e].v[1], [])) === 0 && vec3.length(vec3.subtract(edge[1], edges[e].v[0], [])) === 0)) {
            return;
          }
        }
        edges.push({v : [vec3.create(edge[0]),vec3.create(edge[1])], e : vec3.subtract(edge[1], edge[0], [])});
      }

      function addVertex(vertices, vertex) {
        for(var v in vertices) {
          if(vec3.length(vec3.subtract(vertex, vertices[v], [])) === 0) return
        }
        vertices.push(vec3.create(vertex));
      }

      var i = 0, j = 0, lastNormal;
      for(var n = 0; n < obj.normal.length; n += 3) {
        var normal = [obj.normal[n], obj.normal[n+1], obj.normal[n+2]];
        if(lastNormal && Math.abs(vec3.length(vec3.subtract(normal, lastNormal, []))) > 0.0001) {
          var face = {v : [], n : lastNormal}, lv, v;
          for(var k = j; k < i; k++) {
            lv = v;
            v = [obj.vertices[3*k], obj.vertices[3*k + 1], obj.vertices[3*k + 2]]
            face.v.push(v);
            if(d.e.length < 12 && lv) {
              addEdge(d.e, [v, lv]);
            }
            if(d.v.length < 8) {
              addVertex(d.v, v);
            }
          }
          d.f.push(face);
          j = i;
        }
        i++;
        lastNormal = normal;
      }
      if(lastNormal) {
        var face = {v : [], n : lastNormal}, lv, v;
        for(var k = j; k < i; k++) {
          lv = v;
          v = [obj.vertices[3*k], obj.vertices[3*k + 1], obj.vertices[3*k + 2]]
          face.v.push(v);
          if(d.e.length < 12 && lv) {
            addEdge(d.e, [v, lv]);
          }
          if(d.v.length < 8) {
            addVertex(d.v, v);
          }
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

      for(var e in d.e) {
        mat4.multiplyVec3(mat, d.e[e].v[0]);
        mat4.multiplyVec3(mat, d.e[e].v[1]);
        mat4.multiplyVec3(mat, d.e[e].e);
      }

      for(var v in d.v) {
        mat4.multiplyVec3(mat, d.v[v]);
      }

    },

    postInit : function(obj) {
      var tex = [], rotateMat = [], mat = mat4.identity([]);
      for(var i = 0; i < obj.texCoords.length; i += 2) {
        var v = [obj.texCoords[i], obj.texCoords[i + 1], (i < obj.texCoords.length/2 ? 1:-1)], j = 3*i/2,
            nv = [obj.normal[j], obj.normal[j + 1], obj.normal[j + 2]];
            rm = mat4.identity([]), rmi = mat4.identity([]);
        mat4.rotate(rm, vec3.angle([0, 0, 1], nv), vec3.cross([0, 0, 1], nv, []));
        mat4.inverse(rm, rmi);
        mat4.multiplyVec3(rm, v);
        tex.push(v);
        rotateMat.push(rmi);
      }
      mat4.scale(mat, vec3.scale(this.feature.componentLink.Transform.scale, 2, []));

      obj.texCoords = [];
      for(var j in tex) {
        mat4.multiplyVec3(mat, tex[j]);
        mat4.multiplyVec3(rotateMat[j], tex[j]);
        obj.texCoords.push(tex[j][0]);
        obj.texCoords.push(tex[j][1]);
      }
    },

  });

  /* Cube  -  Attributes for cube */

  function Cube(config) {
    Cube.parent.call(this, config);
  }
  AGameE.Cube = Cube;
  AGameE.inherit(AGameE.Polyhedron, Cube, {

    getAttributes : function(obj) {
      return {
        vertices : [1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, 1,
                    -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1],
        normal : [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1,
                  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0],
        texCoords : [1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0],
        indices : [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23],
      };
    },

  });

  /* Sphere  -  Sphere object */

  function Sphere(config) {
    Sphere.parent.call(this, config);
  }
  AGameE.Sphere = Sphere;
  AGameE.inherit(AGameE.Shape, Sphere, {

    getAttributes : function(obj) {
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

  });

})();
