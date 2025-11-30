# Montime.io Monitoring Agent

Monitor your servers with lightweight agents that send metrics to Montime.io every 60 seconds.

## Features

- **CPU Usage**: Real-time CPU utilization percentage
- **Memory Usage**: RAM utilization percentage
- **Disk Usage**: Root filesystem (/) usage percentage
- **Connectivity Status**: Up/down status based on internet connectivity
- **Auto-retry**: Retries failed requests 3 times with 5-second intervals
- **Lightweight**: Minimal resource footprint
- **Cross-platform**: Works on Ubuntu, Debian, CentOS, RHEL, and more

## Quick Start

### 1. Get Your Server Token

1. Log in to [Montime.io](https://montime.io)
2. Go to your Dashboard
3. Click "Add Server"
4. Copy your server token

### 2. Choose Your Agent

We provide two agents:

- **Bash Agent** (`agent.sh`) - Zero dependencies, uses standard Linux utilities
- **Python Agent** (`agent.py`) - More accurate metrics using psutil library

---

## Option A: Bash Agent (Recommended for Simplicity)

### Quick Install (One-liner)

```bash
curl -sL https://raw.githubusercontent.com/yourusername/montime/main/agents/agent.sh -o /tmp/agent.sh && \
chmod +x /tmp/agent.sh && \
export SERVER_TOKEN="your-token-here" && \
/tmp/agent.sh
```

### Manual Installation

```bash
# Download the agent
wget https://raw.githubusercontent.com/yourusername/montime/main/agents/agent.sh
chmod +x agent.sh

# Set your server token
export SERVER_TOKEN="your-token-here"

# Optional: Set custom base URL (defaults to https://montime.io)
export BASE_URL="https://your-custom-domain.com"

# Run the agent
./agent.sh
```

### Run as Systemd Service

```bash
# Create installation directory
sudo mkdir -p /opt/montime

# Download the agent
sudo wget https://raw.githubusercontent.com/yourusername/montime/main/agents/agent.sh -O /opt/montime/agent.sh
sudo chmod +x /opt/montime/agent.sh

# Download systemd service file
sudo wget https://raw.githubusercontent.com/yourusername/montime/main/agents/systemd/montime-agent-bash.service \
  -O /etc/systemd/system/montime-agent.service

# Edit the service file to add your token
sudo nano /etc/systemd/system/montime-agent.service
# Replace YOUR_SERVER_TOKEN_HERE with your actual token

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable montime-agent
sudo systemctl start montime-agent

# Check status
sudo systemctl status montime-agent

# View logs
sudo journalctl -u montime-agent -f
```

---

## Option B: Python Agent (Recommended for Accuracy)

### Quick Install

```bash
# Download the agent
wget https://raw.githubusercontent.com/yourusername/montime/main/agents/agent.py
chmod +x agent.py

# The agent will auto-install dependencies (psutil, requests)
export SERVER_TOKEN="your-token-here"
python3 agent.py
```

### Run as Systemd Service

```bash
# Install Python and pip if not already installed
sudo apt-get update && sudo apt-get install -y python3 python3-pip  # Debian/Ubuntu
# sudo yum install -y python3 python3-pip  # CentOS/RHEL

# Create installation directory
sudo mkdir -p /opt/montime

# Download the agent
sudo wget https://raw.githubusercontent.com/yourusername/montime/main/agents/agent.py -O /opt/montime/agent.py
sudo chmod +x /opt/montime/agent.py

# Install dependencies
sudo pip3 install psutil requests

# Download systemd service file
sudo wget https://raw.githubusercontent.com/yourusername/montime/main/agents/systemd/montime-agent.service \
  -O /etc/systemd/system/montime-agent.service

# Edit the service file to add your token
sudo nano /etc/systemd/system/montime-agent.service
# Replace YOUR_SERVER_TOKEN_HERE with your actual token

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable montime-agent
sudo systemctl start montime-agent

# Check status
sudo systemctl status montime-agent

# View logs
sudo journalctl -u montime-agent -f
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERVER_TOKEN` | Yes | - | Your server authentication token from Montime.io |
| `BASE_URL` | No | `https://montime.io` | Custom Montime.io instance URL |

### Metrics Collection

The agent collects the following metrics every 60 seconds:

- **CPU Usage**: Percentage of CPU utilization
- **Memory Usage**: Percentage of RAM in use
- **Disk Usage**: Percentage of root filesystem (/) in use
- **Status**: `up` if server can ping 8.8.8.8, otherwise `down`

### API Endpoint

Metrics are sent via POST to:
```
{BASE_URL}/api/metrics/ingest
```

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {SERVER_TOKEN}
```

**Request Body:**
```json
{
  "cpu": 45.2,
  "memory": 68.5,
  "disk": 42.1,
  "status": "up"
}
```

---

## Troubleshooting

### Agent not sending metrics

1. **Check token**: Verify your `SERVER_TOKEN` is correct
   ```bash
   echo $SERVER_TOKEN
   ```

2. **Test connectivity**: Ensure you can reach Montime.io
   ```bash
   curl -I https://montime.io
   ```

3. **Check logs**: View agent output
   ```bash
   # If running manually
   ./agent.sh  # or python3 agent.py

   # If running as systemd service
   sudo journalctl -u montime-agent -f
   ```

4. **Test metrics endpoint manually**:
   ```bash
   curl -X POST https://montime.io/api/metrics/ingest \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{"cpu":50,"memory":60,"disk":40,"status":"up"}'
   ```

### Permission issues

The agent needs to run with sufficient privileges to read system metrics:

```bash
# Run with sudo if needed
sudo -E ./agent.sh  # -E preserves environment variables
```

### Python dependencies

If auto-install fails, manually install dependencies:

```bash
pip3 install psutil requests
# or
sudo pip3 install psutil requests
```

### Systemd service not starting

```bash
# Check service status
sudo systemctl status montime-agent

# View detailed logs
sudo journalctl -u montime-agent -n 50

# Restart the service
sudo systemctl restart montime-agent
```

---

## Uninstallation

### Stop and Remove Systemd Service

```bash
# Stop the service
sudo systemctl stop montime-agent

# Disable the service
sudo systemctl disable montime-agent

# Remove service file
sudo rm /etc/systemd/system/montime-agent.service

# Reload systemd
sudo systemctl daemon-reload

# Remove agent files
sudo rm -rf /opt/montime
```

### Remove Standalone Agent

```bash
# Stop the process
pkill -f agent.sh  # or pkill -f agent.py

# Remove the file
rm agent.sh  # or rm agent.py
```

---

## Security Notes

- **Keep your token secure**: Never commit your `SERVER_TOKEN` to version control
- **Use HTTPS**: The agent always uses HTTPS for secure communication
- **Firewall**: Ensure outbound HTTPS (port 443) is allowed
- **Minimal permissions**: Run with minimum required privileges

---

## Advanced Usage

### Custom Monitoring Interval

Edit the agent script and change the `INTERVAL` variable:

```bash
# Bash agent
INTERVAL=30  # Check every 30 seconds

# Python agent
INTERVAL = 30  # Check every 30 seconds
```

### Custom Ping Host

Change the connectivity check target:

```bash
# Bash agent
PING_HOST="1.1.1.1"

# Python agent
PING_HOST = '1.1.1.1'
```

### Multiple Servers

Run separate agent instances with different tokens:

```bash
# Server 1
export SERVER_TOKEN="token1"
./agent.sh &

# Server 2
export SERVER_TOKEN="token2"
./agent.py &
```

---

## Support

For issues, questions, or feature requests:

- **Documentation**: https://montime.io/docs
- **Dashboard**: https://montime.io/dashboard
- **Support**: support@montime.io

---

## License

MIT License - See LICENSE file for details
