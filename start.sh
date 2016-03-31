node serialport &

sleep 1

if [ `uname` = 'Darwin' ]; then
  open http://127.0.0.1:23456/index.html &
else
  xdg-open http://127.0.0.1:23456/index.html &
fi

fg
