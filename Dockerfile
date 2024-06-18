# Use a base image with Python and Node.js pre-installed
FROM python:3.9-slim AS python_node

# Set working directory
WORKDIR /app

# Copy Python requirements file and install Python dependencies
COPY Python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm

# Copy all necessary files to the container
COPY . /app/

# Install Node.js dependencies
WORKDIR /app/server
RUN npm install

# Expose port 3000 for the Node.js server
EXPOSE 3000

# Command to run the Node.js server
CMD ["node", "index.js"]
