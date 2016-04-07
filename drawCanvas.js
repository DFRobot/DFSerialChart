var serverURL = 'http://127.0.0.1:23456/';

// dynamic data points
var dataPoints = [];

// chart object
var chart;

// data sampling function interval object
var intervalObj;

// serial read frequency
var samplingSpeed = 100;

// the global x-axis value counter for consistent plot
var xAxisCounter = 0;

// init com ports control
var needInit = true;
var initFinished = false;

// switch for displaying received data or not
var updating = true;


// config object
var config = {
  "maxLength": 100
};

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

    $.get(serverURL + "read", {
      "_ts": $.now()
    }, function(lines) {

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

function populateData(lines) {
  // console.log(lines);
  lines.forEach(function(data) {
    if (!data || data.length === 0 || data === '""' || !updating) {
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
      if (length > config.maxLength) {
        dataPoints[counter].dataPoints = dataPoints[counter].dataPoints.splice(length -
          config.maxLength, config.maxLength);
      }

      counter++;
    });
    xAxisCounter++;
  });
}

function stopRead() {
  if (intervalObj) {
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
  config.baudrate = baudrate;
  config.port = button.html();
  saveConfig();
}

function toggleUpdate() {
  updating = !updating;
}

function setUpdate(state) {
  updating = state;
}

function changeMaxLength(length) {
  config.maxLength = length;
  saveConfig();
}

function writeToSerial(data) {
  $.get(serverURL + "write/" + encodeURI(data));
}

function setYRange(min, max) {
  if (chart && chart.options && chart.options.axisY) {
    chart.options.axisY.viewportMinimum = min;
    chart.options.axisY.viewportMaximum = max;
  } else {
    console.log('retry axisY');
    setTimeout(function() {
      setYRange(min, max);
    }, 500);
  }
}

function resetYRange() {
  if (!chart) return;
  delete chart.options.axisY.viewportMinimum;
  delete chart.options.axisY.viewportMaximum;
}

// default action here
startRead();
readConfig();


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
    delete config.min;
    delete config.max;
    resetYRange();
  }
  config.chartControl = state;
  saveConfig();
});


function changeChartRange() {
  if ($("#minY").val() && $("#maxY").val()) {
    setYRange($("#minY").val(), $("#maxY").val());
  }
  config.min = $("#minY").val();
  config.max = $("#maxY").val();
  saveConfig();
}


function dataNameChange() {
  var names = $('#datanames').val();
  _dataNameChange(names);
  config.dataNames = names;
  saveConfig();
}

function _dataNameChange(names) {
  var nameArray = names.split(",");
  for (var index in nameArray) {
    if (dataPoints[index]) {
      dataPoints[index].name = nameArray[index];
    }
  }
}

var updatingConfig;

function readConfig() {
  $.get(serverURL + "getConfig", function(data) {
    if (data) {
      $.extend(true, config, data);

      console.log('read config:' + $.now());
      console.log(config);

      updatingConfig = true;

      if (config.port !== undefined) {
        _connect(config.port, config.baudrate || 57600);
      }

      if (config.min !== undefined) {
        $("#minY").val(config.min);
      }

      if (config.max !== undefined) {
        $("#maxY").val(config.max);
      }

      if (config.dataNames !== undefined) {
        $('#datanames').val(config.dataNames);
      }

      config.chartControl = !!JSON.parse(config.chartControl);
      if (config.chartControl !== undefined) {
        $("[name='chartControl']").bootstrapSwitch('state', config.chartControl);
        if (config.chartControl) {
          $('#chartControlBody').show();
        } else {
          $('#chartControlBody').hide();
        }
      }

      if (config.baudrate !== undefined) {
        $("#baudrate").val(config.baudrate);
      }


      if (config.maxLength) {
        $("#maxlength").val(config.maxLength);
      }

      updatingConfig = false;
    }
  });
}

function saveConfig() {

  if (updatingConfig) return;

  console.log('save config:' + $.now());
  console.log(config);
  $.get(serverURL + "setConfig?" + $.param(config), function(data) {
    console.log(data);
  });
}
