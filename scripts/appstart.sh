#!/bin/bash
echo "# Navigate to project location"
cd /var/apps/elaap-nodeapi-v1
pwd

echo "# pulling latest code"
git pull
#comment

#echo "# stop running server"

#/home/ubuntu/.nvm/versions/node/v14.19.3/bin/pm2 delete nodeapi
# /home/ubuntu/.nvm/versions/node/v14.19.3/bin/pm2 --name nodeapi start server.js 
/home/ubuntu/.nvm/versions/node/v14.19.3/bin/pm2 restart nodeapi

#echo "# Make sure you have added all the new env variables to .env file"

#echo "#================================"
#echo "#================================"

#echo "# Restart the server"

