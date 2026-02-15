#!/bin/bash

# Wait for MongoDB to start
echo "Waiting for MongoDB to start..."
until mongosh --host mongo --eval 'quit(db.runCommand({ ping: 1 }).ok ? 0 : 2)' &> /dev/null; do
  printf '.'
  sleep 1
done

echo "MongoDB started."

# Initialize Replica Set
echo "Initializing Replica Set..."
mongosh --host mongo <<EOF
var config = {
    "_id": "rs0",
    "version": 1,
    "members": [
        {
            "_id": 0,
            "host": "mongo:27017",
            "priority": 2
        }
    ]
};
rs.initiate(config, { force: true });
rs.status();
EOF

echo "Replica Set initialized."
