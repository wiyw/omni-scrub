#!/bin/bash

# Omni-Scrub Setup Script for Arduino Uno Q
# Run this on the Uno Q via SSH or ADB shell

set -e

echo "=== Omni-Scrub Setup for Arduino Uno Q ==="

# Update package list
echo "[1/6] Updating package list..."
apt-get update -y

# Install Node.js 20.x
echo "[2/6] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Check Node.js version
node -v
npm -v

# Create app directory
echo "[3/6] Creating app directory..."
mkdir -p /root/omni-scrub
cd /root/omni-scrub

# Copy project files (you'll need to SCP these)
echo "[4/6] Copy project files to /root/omni-scrub/"
echo "On your laptop run:"
echo "  scp -r dist/* root@UNO_Q_IP:/root/omni-scrub/"
echo ""
echo "Or use USB with ADB:"
echo "  adb push dist/ /root/omni-scrub/"
echo ""

# For now, create a simple placeholder
cat > package.json << 'EOF'
{
  "name": "omni-scrub",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2"
  }
}
EOF

# Install dependencies
echo "[5/6] Installing npm dependencies..."
npm install

# Create startup service
echo "[6/6] Creating startup service..."
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

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Copy the built files to the Uno Q:"
echo "   scp -r dist/* root@<UNO_Q_IP>:/root/omni-scrub/"
echo ""
echo "2. Start the service:"
echo "   systemctl start omniscrub"
echo ""
echo "3. Check status:"
echo "   systemctl status omniscrub"
echo ""
echo "4. Access the UI at:"
echo "   http://<UNO_Q_IP>:3000"
