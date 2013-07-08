function degToRad(deg) {
  return deg*Math.PI/180;
}

var tmp;

window.heap = {
  insert : function(array, element, comparator) {
    comparator = comparator || heap.comparator;

    array.push(element);

    heap.moveUp(array, array.length - 1, comparator);
  },

  delete : function(array, comparator) {
    comparator = comparator || heap.comparator;
    if(array.length > 0) {
      var ele = array[0];
      array[0] = array[array.length - 1];
      delete array[array.length - 1];
      array.length = array.length - 1;
      heap.moveDown(array, 0, comparator);

      return ele;
    }
    return ["null"];
  },

  moveUp : function(array, i, comparator) {
    var j = Math.floor((i - 1)/2);
    while(j > 0) {
      if(comparator(array[i], array[j]) > 0.0) {
        tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
        i = j;
        j = Math.floor((i - 1)/2);
      }
      else {
        break;
      }
    }
  },

  moveDown : function(array, i, comparator) {
    var j = 2*i + 1, k;
    while(j < array.length) {
      if(comparator(array[i], array[j]) < 0.0) {
        tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
        i = j;
        j = 2*i + 1;
      }
      else if(j + 1 < array.length && comparator(array[i], array[j + 1]) < 0.0) {
        tmp = array[i];
        array[i] = array[j + 1];
        array[j + 1] = tmp;
        i = j + 1;
        j = 2*i + 2;
      }
      else {
        break;
      }
    }
  },

  comparator : function(a, b) {
    return b - a;
  },
};

vec3.angle = function (a, b) {
  return Math.acos(vec3.dot(a, b)/(vec3.length(a)*vec3.length(b)));
};

vec3.project = function(a, b, c) {
  (c||c=a);
  vec3.scale(c, vec3.dot(a, b));
  return c;
};

line = {};
line.perpPointFromLine = function(l1, p1, l2, p2, h) {
  var n1 = vec3.normalize(l1, []), n2 = vec3.normalize(l2, []),
      t1 = (p2[0] - p1[0])*n2[0] + (p2[1] - p1[1])*n2[1] + (p2[2] - p1[2])*n2[2],
      dn = n1[0]*n2[0] + n1[1]*n2[1] + n1[2]*n2[2];

  if(dn !== 0) {
    return [[(t1 + h)/dn, vec3.add(p1, vec3.scale(l1, (t1 + h)/dn, []), [])], [(t1 - h)/dn, vec3.add(p1, vec3.scale(l1, (t1 - h)/dn))]];
  }
  return [];
};
line.perpPointFromPoint = function(l1, p1, p2) {
  var n = vec3.normalize(l1, []),
      p = [0, 0, 0], d1 = (p2[0] - p1[0])*n[0] + (p2[1] - p1[1])*n[1] + (p2[2] - p1[2])*n[2], d = d1 / vec3.length(l1);
  vec3.scale(n, d1);
  vec3.add(n, p1, p);
  return [p, d];
};
