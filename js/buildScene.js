(function() {

  AGameE.BuildScene = function(config) {

    var entities = [];

    /* Walls */
    for(var x in config.map) {
      for(var z in config.map[x]) {
        if(config.map[x][z] === 1) {
          entities.push(new AGameE.Entity({
            features : [ 
              new AGameE.Render({
                object : {
                  ambientColor : { r : 0.2, g : 0.2, b : 0.2 },
                  shape : 'polyhedron',
                },
                texture : {
                  imageSrc : config.wallTexture,
                },
                transform : {
                  translate : [2.0*x, 0.0, 2.0*z],
                  rotate : [0.0, 0.0, 0.0],
                  scale : [1.0, 1.0, 1.0],
                },
              }),
              new AGameE.Physx({
                fixedBody : "true",
              }),
            ],
          }));
        }
      }
    }

    /* Roof */
    if(config.roofTexture) {
      entities.push(new AGameE.Entity({
        features : [
          new AGameE.Render({
            object : {
              ambientColor : { r : 0.2, g : 0.2, b : 0.2 },
              shape : 'polyhedron',
            },
            texture : {
              imageSrc : config.roofTexture,
            },
            transform : {
              translate : [config.map.length/8+1, 3.0, config.map[0].length/8+1],
              rotate : [0.0, 0.0, 0.0],
              scale : [config.map.length, 0.5, config.map[0].length],
            },
          }),
          new AGameE.Physx({
            fixedBody : "true",
          }),
        ],
      }));
    }

    /* Floor */
    if(config.floorTexture) {
      entities.push(new AGameE.Entity({
        features : [
          new AGameE.Render({
            object : {
              ambientColor : { r : 0.2, g : 0.2, b : 0.2 },
              shape : 'polyhedron',
            },
            texture : {
              imageSrc : config.floorTexture,
            },
            transform : {
              translate : [config.map.length/8+1, -3.0, config.map[0].length/8+1],
              rotate : [0.0, 0.0, 0.0],
              scale : [config.map.length, 0.5, config.map[0].length],
            },
          }),
          new AGameE.Physx({
            fixedBody : "true",
          }),
        ],
      }));
    }

    return entities;

  };
})();
