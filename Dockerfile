# Use an older Python version with Debian slim
FROM python:3.7-slim AS python_node

# Set working directory
WORKDIR /app

# Install system dependencies for Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (LTS) from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Copy Python requirements and install dependencies
COPY Python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Verify that server directory exists
RUN ls /app && ls /app/server && test -f /app/server/package.json

# Install Node.js dependencies
WORKDIR /app/server
RUN npm install

# Expose Node.js port
EXPOSE 3000

# Start Node.js server
CMD ["node", "index.js"]
