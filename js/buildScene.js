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
                  shape : 'cube',
                },
                texture : {
                  imageSrc : config.wallTexture,
                },
                transform : {
                  translate : [4.0*x, 0.0, 4.0*z],
                  rotate : [0.0, 0.0, 0.0],
                  scale : [2.0, 2.0, 2.0],
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
    entities.push(new AGameE.Entity({
      features : [
        new AGameE.Render({
          object : {
            ambientColor : { r : 0.2, g : 0.2, b : 0.2 },
            shape : 'cube',
          },
          texture : {
            imageSrc : config.roofTexture,
          },
          transform : {
            translate : [config.map.length, 2.5, config.map[0].length],
            rotate : [0.0, 0.0, 0.0],
            scale : [config.map.length*2, 1.0, config.map[0].length*2],
          },
        }),
        new AGameE.Physx({
          fixedBody : "true",
        }),
      ],
    }));

    /* Floor */
    entities.push(new AGameE.Entity({
      features : [
        new AGameE.Render({
          object : {
            ambientColor : { r : 0.2, g : 0.2, b : 0.2 },
            shape : 'cube',
          },
          texture : {
            imageSrc : config.floorTexture,
          },
          transform : {
            translate : [config.map.length, -2.5, config.map[0].length],
            rotate : [0.0, 0.0, 0.0],
            scale : [config.map.length*2, 1.0, config.map[0].length*2],
          },
        }),
        new AGameE.Physx({
          fixedBody : "true",
        }),
      ],
    }));

    return entities;

  };
})();
