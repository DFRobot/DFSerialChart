
      var serverURL = 'http://localhost:23456/';

      // dynamic data points
      var dataPoints = [];

      // chart object
      var chart;

      var intervalObj;

      // serial read frequency
      var samplingSpeed = 100;

      // max data points length
      var maxLength = 100;

      var globalX = 0;

      var needInit = true;
      var initFinished = false;

      function initCanvas(lines) {
        needInit = false;

        lines.forEach(function(data) {
          var array = data.split(',');
          var counter = 0;
          var columns = array.forEach(function(elem) {
            dataPoints[counter] = dataPoints[counter] || {
              type: "line",
              dataPoints: []
            };
            dataPoints[counter].dataPoints.push({x: globalX, y: parseFloat(elem)});
            counter++;
          });
          globalX++;
        });

        chart = new CanvasJS.Chart("chart", {
          title: {
            text: "Serial Data"
          },
          axisX: {
            title: "Counter"
          },
          axisY: {
            title: "Value"
          },
          // data: [   {     type: "line",     dataPoints: dataPoints   } ]
          data: dataPoints
        });

        initFinished = true;
      }

      function startRead() {
        intervalObj = setInterval(function() {

          $.get(serverURL + "read", function(lines) {

            if (needInit) {
              initCanvas(lines);
            }

            if (!initFinished) {
              return;
            }

            lines.forEach(function(data) {
              if (!data || data.length === 0){
                return;
              }
              var array = data.split(',');
              var counter = 0;
              var columns = array.forEach(function(elem) {
                dataPoints[counter] = dataPoints[counter] || {
                  type: "line",
                  dataPoints: []
                };
                dataPoints[counter].dataPoints.push({x: globalX, y: parseFloat(elem)});

                counter++;
              });
              globalX++;
            });
            // console.log(dataPoints);
            chart.render();
          });
        }, samplingSpeed);
      }

      function stopRead() {
        clearInterval(intervalObj);
      }

      function _connect(port, baudrate) {
        $.get(serverURL + "connect?port=" + port + "&baudrate=" + baudrate);
      }

      function listPorts(listElementId) {
        $.get(serverURL + "listPorts", function(data) {
          if (listElementId.indexOf('#') !== 0) {
            listElementId = "#" + listElementId;
          }
          $(listElementId).html("");
          data.forEach(function(port) {
            $(listElementId).append('<button type="button" class="btn btn-default" onclick="connect($(this))">' + port.comName + "</button>");
          });
        });
      }

      function connect(button){
        var baudrate = $('#baudrate').val() || $('#baudrate').attr("placeholder");
        _connect(button.html(), baudrate);
      }


      // default action here
      startRead();

      setInterval(function() {
        listPorts("#ports");
      }, 1000);
