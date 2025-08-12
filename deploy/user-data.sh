#!/bin/bash

# QuizMaster EC2 User Data Script
# Automatically sets up the application on Amazon Linux 2023

yum update -y
yum install -y git wget curl

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install PostgreSQL client
yum install -y postgresql15

# Create application user
useradd -m -s /bin/bash quizmaster

# Create application directory
mkdir -p /opt/quizmaster
chown quizmaster:quizmaster /opt/quizmaster

# Switch to application directory
cd /opt/quizmaster

# Download application from S3
BUCKET_NAME=$(aws s3 ls | grep quizmaster-uploads | awk '{print $3}' | head -1)
aws s3 cp s3://$BUCKET_NAME/quizmaster-app.tar.gz .
aws s3 cp s3://$BUCKET_NAME/.env.production .env

# Extract application
tar -xzf quizmaster-app.tar.gz
rm quizmaster-app.tar.gz

# Change ownership
chown -R quizmaster:quizmaster /opt/quizmaster

# Install dependencies as application user
sudo -u quizmaster bash -c "cd /opt/quizmaster && npm ci --production"

# Create PM2 ecosystem file
cat > /opt/quizmaster/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'quizmaster',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/quizmaster/error.log',
    out_file: '/var/log/quizmaster/out.log',
    log_file: '/var/log/quizmaster/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
EOF

# Create log directory
mkdir -p /var/log/quizmaster
chown quizmaster:quizmaster /var/log/quizmaster

# Create systemd service for PM2
cat > /etc/systemd/system/quizmaster.service << 'EOF'
[Unit]
Description=QuizMaster Application
After=network.target

[Service]
Type=forking
User=quizmaster
WorkingDirectory=/opt/quizmaster
Environment=PATH=/usr/bin:/usr/local/bin
Environment=PM2_HOME=/home/quizmaster/.pm2
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
PIDFile=/home/quizmaster/.pm2/pm2.pid
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable quizmaster
systemctl start quizmaster

# Install Nginx for reverse proxy
yum install -y nginx

# Configure Nginx
cat > /etc/nginx/conf.d/quizmaster.conf << 'EOF'
upstream quizmaster {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://quizmaster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_timeout 86400;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    location /socket.io/ {
        proxy_pass http://quizmaster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Start Nginx
systemctl enable nginx
systemctl start nginx

# Configure firewall
yum install -y firewalld
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=5000/tcp
firewall-cmd --reload

# Create health check script
cat > /opt/quizmaster/health-check.sh << 'EOF'
#!/bin/bash
curl -f http://localhost:5000/api/health || exit 1
EOF

chmod +x /opt/quizmaster/health-check.sh

# Add cron job for health monitoring
echo "*/5 * * * * root /opt/quizmaster/health-check.sh || systemctl restart quizmaster" >> /etc/crontab

# Setup log rotation
cat > /etc/logrotate.d/quizmaster << 'EOF'
/var/log/quizmaster/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0640 quizmaster quizmaster
    sharedscripts
    postrotate
        /usr/bin/pm2 reloadLogs
    endscript
}
EOF

# Install CloudWatch agent (optional)
if command -v amazon-cloudwatch-agent-ctl &> /dev/null; then
    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/quizmaster/combined.log",
                        "log_group_name": "/aws/ec2/quizmaster",
                        "log_stream_name": "{instance_id}"
                    }
                ]
            }
        }
    }
}
EOF
    
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
        -a fetch-config \
        -m ec2 \
        -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
        -s
fi

# Final status check
sleep 30
if systemctl is-active --quiet quizmaster; then
    echo "✅ QuizMaster application deployed successfully!"
    echo "🌐 Application available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
else
    echo "❌ Deployment failed. Check logs: journalctl -u quizmaster -f"
fi