# Deploy Omni-Scrub to Arduino Uno Q

# 1. First, get your Uno Q's IP address
# On Uno Q terminal, run: hostname -I

UNO_Q_IP="192.168.1.100"  # Change this to your Uno Q's IP

# 2. Copy the built files
echo "Copying files to Uno Q at $UNO_Q_IP..."
scp -r dist/* root@$UNO_Q_IP:/root/omni-scrub/

# 3. SSH into Uno Q and install dependencies
ssh root@$UNO_Q_IP "cd /root/omni-scrub && npm install"

# 4. Start the server
ssh root@$UNO_Q_IP "cd /root/omni-scrub && node server.js &"

echo ""
echo "Done! Access the UI at: http://$UNO_Q_IP:3000"
