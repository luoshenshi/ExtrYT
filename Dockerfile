# Use a base image with Python and Node.js pre-installed
FROM python:3.9-slim AS python_node

# Set working directory
WORKDIR /app

# Copy Python requirements file
COPY Python/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Node.js code
COPY Server/ .

# Install Node.js dependencies
RUN apt-get update && apt-get install -y nodejs npm
RUN npm install

# Expose port 3000 for the Node.js server
EXPOSE 3000

# Command to run the Node.js server
CMD ["node", "index.js"]
