var http = require('http');

var pm2 = require('pm2');

var urlParser = require('url');

var fs = require('fs');

var dialog = require('dialog');

var firmataServer;
var serialServer;
var vortexServer;

function startFirmata() {
  stopSerial();
  stopVortex();
  firmataServer = pm2.start({
    script: 'server.js'
  }, errorHandlerExit);
}

function startSerial() {
  stopFirmata();
  stopVortex();
  serialServer = pm2.start({
    script: 'serialport.js'
  }, errorHandlerExit);
}

function startVortex() {
  stopSerial();
  stopFirmata();
  vortexServer = pm2.start({
    script: 'vortex.js'
  }, errorHandlerExit);
}

function stopFirmata() {
  console.log('stopping firmata');
  pm2.stop('server', errorHandler);
}

function stopSerial() {
  console.log('stopping serial');
  pm2.stop('serialport', errorHandler);
}

function stopVortex() {
  console.log('stopping vortex');
  pm2.stop('vortex', errorHandler);
}


function startScratch(){
  console.log("starting scratch");
  pm2.start({
    "name": "scratch",
    "script": "scratch/scratch.exe",
    "interpreter": "",
    "exec_mode": "fork_mode"
  }, errorHandler);
}

function stopScratch(){
  console.log("stopping scratch");
  pm2.stop('scratch', errorHandler);
}

function errorHandlerExit(err, apps) {
  // if pm2 fails to start process, no point continue
  // show error dialog maybe and exit.
  // TODO popup window
  if (err) {
    console.error(err);
    dialog.warn(JSON.stringify(err));
    process.exit(-1);
  }
}

function errorHandler(err, apps) {
  // expected to fail because we may stop non-existing process
  if (err) {
    console.error(err);
  }
}

var routingConfig = {
  "startfirmata": startFirmata,
  "startserial": startSerial,
  "startvortex": startVortex,
  "startscratch": startScratch,
  "stopfirmata": stopFirmata,
  "stopserial": stopSerial,
  "stopvortex": stopVortex,
  "stopscratch": stopScratch,
  "shutdown": shutdown
};

pm2.connect(true, function(err) {
  if (err) {
    console.error(err);
    process.exit(2);
  } else {
    startSerial();
  }
});

pm2.launchBus(function(err, bus) {
  bus.on('process:event', function(event) {
    console.log('event');
    console.log(JSON.stringify(event.event));
    console.log(JSON.stringify(event.process));

    // catch exit event for flash exe
    if (event.event === 'exit') {
      if (event.process.name === 'scratch') {
        // exit main
        // scratch exited, exit with it.
        process.exit(0);
      }
    }
  });
});

var proxy = http.createServer(function(request, response) {

  var parsedURL = urlParser.parse(request.url, true);

  if (parsedURL.pathname === "/") parsedURL.pathname = '/index.html';

  if (parsedURL.pathname === '/manageService') {
    var serviceFunction = routingConfig[parsedURL.query.service];
    if (serviceFunction && typeof(serviceFunction) === "function") {
      serviceFunction();
    } else {
      console.error("undefined service");
    }
    response.end();
  } else {
    proxyRequest(request, response);
  }

}).listen(34567);



function proxyRequest(request, response) {

  // proxy to
  var options = {
    host: '127.0.0.1',
    port: 23456,
    path: request.url,
    method: request.method
  };

  var req = http.request(options, function(res) {
    res.pipe(response);
  });

  req.on('error', function(error) {
    console.error("Error. Target server maybe down.");
    console.error(error);

    response.end("Error. Target server maybe down.\n");
  });

  req.end();
}

process.on('exit', function() {
  if (pm2) {
    stopFirmata();
    stopSerial();
    stopVortex();

  }
});

process.on('SIGINT', function() {
  //console.log('sigint');
  if (pm2) {
    pm2.killAllModules();
  }
  process.exit(0);
});


function shutdown() {
  console.log('shutting down');
  process.exit(0);
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
