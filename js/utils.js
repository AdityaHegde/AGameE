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
