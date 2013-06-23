(function(){

  function Cube(config) {
    Cube.parent.call(this, config);
  }
  AGameE.Cube = Cube;
  AGameE.inherit(Object, Cube, {
    init : function() {
      var vertices = [], normal = [], indices = [], lastI = 0;
      for(var faceI in this.config.faces) {
        var face = this.config.faces[faceI], lastVertices = [[],[],[]], v = 0, firstVertex = lastI;
        for(var vertexI in face) {
          var vertex = face[vertexI];
          lastVertices[v] = [];
          for(var c = vertex*3; c < vertex*3 + 3; c++) {
            vertices.push(this.config.vertices[c]);
            if(this.config.verticesAsNormals === "true") normal.push(this.config.vertices[c]);

            lastVertices[v].push(this.config.vertices[c]);
          }
          lastI++;
          v = (v + 1) % 3;
        }
        for(var idx = firstVertex + 2; idx < lastI; idx++) {
          indices.push(firstVertex, idx - 1, idx);
        }
        if(this.config.verticesAsNormals !== "true") {
          var n = vec3.normalize(vec3.negate(vec3.cross(vec3.subtract(lastVertices[2], lastVertices[1]), vec3.subtract(lastVertices[1], lastVertices[0]))));
          for(var v = 0; v < face.length; v++) {
            for(var c = 0; c < 3; c++) {
              normal.push(n[c]);
            }
          }
        }
      }

      this.config.vertices = vertices;
      this.config.normal = normal;
      this.config.indices = indices;

      Cube.parent.prototype.init.call(this);
    },
  });

  function Sphere(config) {
    Sphere.parent.call(this, config);
  };
  AGameE.Sphere = Sphere;
  AGameE.inherit(Object, Sphere, {
    init : function() {
      this.config.verticesAsNormals = "true";
      this.config.steps = this.config.steps || 30;
      this.config.raduis = this.config.raduis || 1.0;

      var vertices = [], normal = [], indices = [], texCoords = [], colors = [],
          r = this.config.raduis,
          steps = this.config.steps, angleStep = 360/this.config.steps,
          tv = angleStep, th = 0.0,
          x1, y1 = r, z1, x2, y2 = r * Math.cos(degToRad(tv)), z2,
          rz = r * Math.sin(degToRad(tv)),
          lastVertices = [], i = 0;
      for(var zi = 0; zi < steps; zi++) {
        x1 = rz * Math.sin(degToRad(zi * angleStep));
        z1 = rz * Math.cos(degToRad(zi * angleStep));
        x2 = rz * Math.sin(degToRad((zi + 1) * angleStep));
        z2 = rz * Math.cos(degToRad((zi + 1) * angleStep));
        vertices.push(x1, y2, z1, 0.0, y1, 0.0, x2, y2, z2);
        var n = vec3.normalize([x1, y2, z1]);
        normal.push(n[0], n[1], n[2]);
        n = vec3.normalize([0.0, y1, 0.0]);
        normal.push(n[0], n[1], n[2]);
        n = vec3.normalize([x2, y2, z2]);
        normal.push(n[0], n[1], n[2]);
        if(this.config.imageSrc) texCoords.push(1.0, 0.0, 0.5, 1.0, 0.0, 1.0);
        else if(this.config.color) colors.push(this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a, this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a, this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a);
        indices.push(i, i+1, i+2);
        i += 3;
        lastVertices.push([x1, z1]);
      }
      lastVertices.push([x2, z2]);
      y1 = y2;
      for(var yi = 2; yi < steps; yi++) {
        tv = yi * angleStep;
        y2 = y1;
        y1 = r * Math.cos(degToRad(tv));
        rz = r * Math.sin(degToRad(tv));
        
        for(var zi = 0; zi < steps; zi++) {
          x1 = rz * Math.sin(degToRad(zi * angleStep));
          z1 = rz * Math.cos(degToRad(zi * angleStep));
          x2 = rz * Math.sin(degToRad((zi + 1) * angleStep));
          z2 = rz * Math.cos(degToRad((zi + 1) * angleStep));
          vertices.push(x1, y1, z1, lastVertices[zi][0], y2, lastVertices[zi][1], lastVertices[zi + 1][0], y2, lastVertices[zi + 1][1], x2, y1, z2);
          var n = vec3.normalize([x1, y1, z1]);
          normal.push(n[0], n[1], n[2]);
          n = vec3.normalize([lastVertices[zi][0], y2, lastVertices[zi][1]]);
          normal.push(n[0], n[1], n[2]);
          n = vec3.normalize([lastVertices[zi + 1][0], y2, lastVertices[zi + 1][1]]);
          normal.push(n[0], n[1], n[2]);
          n = vec3.normalize([x2, y1, z2]);
          normal.push(n[0], n[1], n[2]);
          if(this.config.imageSrc) texCoords.push(1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0);
          else if(this.config.color) colors.push(this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a, this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a, this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a, this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a);
          indices.push(i, i+1, i+2, i, i+2, i+3);
          i += 4;
          lastVertices[zi] = [x1, z1];
        }
        lastVertices[lastVertices.length - 1] = [x2, z2];
      }
      y1 = -r;
      for(var zi = 0; zi < steps; zi++) {
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
        if(this.config.imageSrc) texCoords.push(1.0, 1.0, 1.0, 0.0, 0.5, 0.0);
        else if(this.config.color) colors.push(this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a, this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a, this.config.color.r, this.config.color.g, this.config.color.b, this.config.color.a);
        indices.push(i, i+1, i+2);
        i += 3;
      }

      this.config.vertices = vertices;
      this.config.normal = normal;
      this.config.texCoords = texCoords;
      this.config.indices = indices;

      Sphere.parent.prototype.init.call(this);
    },
  });

})();
