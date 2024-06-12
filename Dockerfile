# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy Node.js dependencies and install them
COPY ./Server/package*.json ./Server/
RUN npm ci --prefix ./Server

# Copy Python dependencies and install them
COPY ./Python/requirements.txt ./Python/
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install -r ./Python/requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (adjust if necessary)
EXPOSE 3000

# Define the command to run the application
CMD ["node", "Server/index.js"]
