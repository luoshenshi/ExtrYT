# Base image with Node and Python
FROM node:20-bullseye

# Install Python + pip
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Node files and install deps
COPY node/package*.json ./node/
RUN cd node && npm install

# Copy Python files and install deps
COPY Python/requirements.txt ./Python/
RUN pip3 install -r Python/requirements.txt

# Copy the rest of the code
COPY . .

# Expose port (adjust if your Node server uses a different port)
EXPOSE 3000

# Run Node app as default
CMD ["node", "node/index.js"]
