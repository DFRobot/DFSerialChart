var serialPort = require("serialport");
var SerialPort = serialPort.SerialPort;
var fs = require("fs");

var sp;

var buffer = "";

serialPort.list(function(err, ports) {
  var connected = false;
  ports.forEach(function(port) {

    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);

    if (port.manufacturer.toLowerCase().indexOf("arduino") > -1 ||
      port.pnpId.toLowerCase().indexOf("usb") > -1 ||
      (process.platform === 'darwin' && port.comName.indexOf('cu.usb') > -1)) {
      console.log("arduino: " + port.comName);

      initSerialPort(port.comName, 57600);

    }
  });
});

function initSerialPort(comName, baudRate, callback) {

  // only init one port
  if (sp) {
    return;
  }

  sp = new SerialPort(comName, {
    baudrate: baudRate,
    disconnectedCallback: function() {
      console.log("serial disconnected!");
      // TODO
      closePort(function() {
        sp = null;
      });
    },
    parser: serialPort.parsers.readline("\n")
  }, false);

  sp.open(function(err) {
    if (err) {
      console.error(err);
    }
  });

  sp.on('data', function(data) {
    // console.log('serial received: ' + data);
    data = data.replace(/\n\r/g, '\n').replace(/\r/g, '\n');
    buffer += data;
  });
}


function closePort(callback) {
  if (sp && sp.isOpen()) {
    sp.close(callback);
  }
}


function createServer() {

  var http = require('http');

  var urlParser = require('url');

  var server = http.createServer(function(request, response) {
    var parsedURL = urlParser.parse(request.url, true);

    if (parsedURL.pathname === '/') {
      parsedURL.pathname = '/index.html';
    }

    if (parsedURL.pathname.indexOf('/write') === 0) {
      var params = parsedURL.pathname.substring(1).split("/");
      var string;
      try {
        string = decodeURI(params[1]);
      } catch (err) {
        // malformed URI
        string = params[1];
      }
      console.log(string);
      if (sp && sp.isOpen()) {
        sp.write(string, function(err) {
          if (err) {
            console.error(err);
          } else {
            console.log('written to serial: ' + string);
          }
        });
      }
      response.end();
    }

    if (parsedURL.pathname === '/read') {

      response.writeHead(200, {
        "Content-Type": "application/json"
      });

      if (!buffer.length) {
        response.end("[]");
        return;
      }

      if (buffer.length > 0 && buffer.lastIndexOf("\n") === (buffer.length - 1)) {
        buffer = buffer.substring(0, buffer.length - 1);
      }

      console.log(JSON.stringify(buffer));

      response.end(JSON.stringify(buffer.split('\n')));
      buffer = "";
    }

    if (parsedURL.pathname === '/listPorts') {
      serialPort.list(function(err, ports) {
        console.log(JSON.stringify(ports));
        console.log(sp);
        response.writeHead(200, {
          "Content-Type": "application/json"
        });
        response.end(JSON.stringify(ports));
      });
    }

    if (parsedURL.pathname === '/connect') {
      console.log(parsedURL);
      var comName = parsedURL.query.port;
      var baudRate = parsedURL.query.baudrate;
      console.log("comName:" + comName + "\tbaudRate:" + baudRate);
      closePort(function(err) {
        console.log("port closing");
        if (err) {
          console.error(err);
          response.status(500);
          response.end(err);
        } else {
          console.log("opening port");
          sp = null;
          initSerialPort(comName, baudRate);
          response.end(comName);
        }
      });
    }

    if (parsedURL.pathname === '/close') {
      console.log("closing port!!!");
      closePort(function(err) {
        if (err) {
          console.error(err);
          response.status(500);
          response.end(err);
        } else {
          sp = null;
          response.end(comName);
        }
      });
    }

    if (parsedURL.pathname === '/getConfig') {
      fs.readFile('config.json', function(err, data){
        if (err){
          console.error(err);
          response.end("{}");
        } else {
          response.writeHead(200, {
            "Content-Type": "application/json"
          });
          response.end(data);
        }
      });
    }


    if (parsedURL.pathname === '/setConfig') {
      fs.writeFile('config.json', JSON.stringify(parsedURL.query), function(err){
        if (err){
          console.error(err);
          response.end(err);
        }
      });
    }


    if (parsedURL.pathname === '/reset'){
      response.end();
      process.exit(666);
    }


    var staticFiles = {
      "html": "html",
      "css": "css",
      "js": "javascript"
    };

    Object.keys(staticFiles).forEach(function(fileType) {
      if (endsWith(parsedURL.pathname, fileType)) {
        fs.readFile(parsedURL.pathname.substring(1), "utf8", function(err, data) {
          response.writeHead(200, {
            'Content-Type': 'text/' + staticFiles[fileType]
          });
          response.end(data);
        });
      }
    });

    setTimeout(function() {
      response.end();
    }, 1000);
  });

  var httpPort = 23456;

  server.listen(httpPort);

  console.log("Server listening on port: " + httpPort);
}


createServer();


process.on('exit', function(code) {
  if (sp) {
    sp.close(function(err) {
      if (err) {
        console.error(err);
      }
    });
  } else {
    console.log('no serial port detected, exiting.');
  }
  if (code === 666){
    console.log('restarting...');
  }
});


function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
