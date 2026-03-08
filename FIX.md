# Deploy to Arduino Uno Q - Fixed Path

## Check Current Location
First SSH into your Uno Q and check what's there:
```bash
ssh arduino@192.168.1.100  # or root@
ls -la
```

## If folder is in /home/arduino/, update the path:

cd /home/arduino/omni-scrub
npm install
node server.js
