var serverURL = 'http://127.0.0.1:23456/';

// dynamic data points
var dataPoints = [];

// chart object
var chart;

// data sampling function interval object
var intervalObj;

// serial read frequency
var samplingSpeed = 100;

// max data points length
var maxLength = 100;

// the global x-axis value counter for consistent plot
var xAxisCounter = 0;

// init com ports control
var needInit = true;
var initFinished = false;

// switch for displaying received data or not
var updating = true;

function initCanvas(lines) {
  needInit = false;

  populateData(lines);

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
  stopRead();
  intervalObj = setInterval(function() {

    $.get(serverURL + "read", { "_": $.now() }, function(lines) {

      if (needInit) {
        initCanvas(lines);
      }

      if (!initFinished) {
        return;
      }

      populateData(lines);
      // console.log(dataPoints);
      chart.render();
    });
  }, samplingSpeed);
}

function populateData(lines){
  // console.log(lines);
  lines.forEach(function(data) {
    if (!data || data.length === 0 || data === '""'|| !updating) {
      console.log("no data");
      return;
    }
    var array = data.split(',');
    var counter = 0;
    var columns = array.forEach(function(elem) {
      dataPoints[counter] = dataPoints[counter] || {
        type: "line",
        showInLegend: true,
        toolTipContent: "{name}: x={x}, y={y}",
        dataPoints: []
      };
      dataPoints[counter].dataPoints.push({
        x: xAxisCounter,
        y: parseFloat(elem)
      });

      // shift if length too long
      var length = dataPoints[counter].dataPoints.length;
      if (length > maxLength) {
        dataPoints[counter].dataPoints = dataPoints[counter].dataPoints.splice(length -
          maxLength, maxLength);
      }

      counter++;
    });
    xAxisCounter++;
  });
}

function stopRead() {
  if (intervalObj){
    clearInterval(intervalObj);
    intervalObj = null;
  }
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
      $(listElementId).append(
        '<button type="button" class="btn btn-default" onclick="connect($(this))">' + port.comName +
        "</button>");
    });
  });
}

function connect(button) {
  var baudrate = $('#baudrate').val() || 57600;
  _connect(button.html(), baudrate);
  startRead();
}

function toggleUpdate() {
  updating = !updating;
}

function setUpdate(state) {
  updating = state;
}

function changeMaxLength(length) {
  maxLength = length;
}

function writeToSerial(data) {
  $.get(serverURL + "write/" + encodeURI(data));
}

function setYRange(min, max) {
  if(!chart) return;
  chart.options.axisY.viewportMinimum = min;
  chart.options.axisY.viewportMaximum = max;
}

function resetYRange() {
  if(!chart) return;
  delete chart.options.axisY.viewportMinimum;
  delete chart.options.axisY.viewportMaximum;
}

// default action here
startRead();


setInterval(function() {
  listPorts("#ports");
}, 5000);

//kick off first ports query
listPorts("#ports");


// button control & listeners

$("[type='checkbox']").bootstrapSwitch();
$("[name='dataFlowControl']").on('switchChange.bootstrapSwitch', function(event, state) {
  setUpdate(state);
});

$("[name='chartControl']").on('switchChange.bootstrapSwitch', function(event, state) {
  if (state) {
    $('#chartControlBody').show();
    changeChartRange();
  } else {
    $('#chartControlBody').hide();
    resetYRange();
  }
});


function changeChartRange() {
  if ($("#minY").val() !== "" && $("#maxY").val() !== "") {
    setYRange($("#minY").val(), $("#maxY").val());
  }
}


function changeNameChange(){
  var names = $('#dataNames').val();
  var nameArray = names.split(",");
  for (var index in nameArray){
    if (dataPoints[index]){
      dataPoints[index].name = nameArray[index];
    }
  }
}
