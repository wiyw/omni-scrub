# Deploy to Arduino Uno Q

## Prerequisites
- Arduino Uno Q connected to WiFi
- SSH enabled on the Uno Q

## Setup Steps

### Step 1: Get Your Uno Q IP Address
1. Connect Uno Q to your computer via USB-C
2. Open Arduino App Lab or use ADB shell
3. Run: `hostname -I`
4. Note the IP address (e.g., `192.168.1.100`)

### Step 2: Enable SSH on Uno Q
In the Uno Q terminal:
```bash
sudo systemctl start ssh
sudo systemctl enable ssh
```

### Step 3: Copy Files to Uno Q
From your laptop:
```bash
# Copy the dist folder
scp -r dist/* root@YOUR_UNO_Q_IP:/root/omni-scrub/
```

### Step 4: Install Node.js on Uno Q
SSH into Uno Q:
```bash
ssh root@YOUR_UNO_Q_IP
```

Then run:
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Create app directory
mkdir -p /root/omni-scrub

# Copy files (from laptop)
# scp -r dist/* root@YOUR_UNO_Q_IP:/root/omni-scrub/

# Install dependencies
cd /root/omni-scrub
npm install
```

### Step 5: Run the Server
```bash
cd /root/omni-scrub
node server.js
```

### Step 6: Access the UI
Open in browser:
```
http://YOUR_UNO_Q_IP:3000
```

## Auto-start on Boot
```bash
# Create systemd service
cat > /etc/systemd/system/omniscrub.service << 'EOF'
[Unit]
Description=Omni-Scrub Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/omni-scrub
ExecStart=/usr/bin/node /root/omni-scrub/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable omniscrub
systemctl start omniscrub
```

## Troubleshooting

### Can't SSH?
- Enable SSH: `sudo apt install openssh-server`
- Check IP: `hostname -I`

### Server won't start?
- Check port: `lsof -i :3000`
- Check logs: `journalctl -u omniscrub -f`

### Bridge/MCU not connecting?
- The sketch must be running on the MCU side
- Upload `sketch/sketch.ino` via Arduino IDE or App Lab
