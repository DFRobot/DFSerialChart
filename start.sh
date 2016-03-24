
if [ `uname` = 'Darwin' ]; then
  open http://localhost:23456/index.html &
else
  xdg-open http://localhost:23456/index.html &
fi
node serialport
