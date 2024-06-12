# Use the official Python image from the Docker Hub
FROM python:3.9-slim as python-build

# Set the working directory
WORKDIR /app

# Copy the Python script and requirements.txt into the container
COPY Python/requirements.txt Python/

# Install Python dependencies
RUN pip install --no-cache-dir -r Python/requirements.txt

# Copy the rest of the Python application
COPY Python/ .

# Use the official Node.js image from the Docker Hub
FROM node:14-alpine as node-build

# Set the working directory
WORKDIR /app

# Copy the Node.js application code
COPY Server/ .

# Install Node.js dependencies
RUN npm install

# Copy the Python environment into the final container
COPY --from=python-build /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=python-build /app /app

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run your application
CMD ["node", "index.js"]
