# Use an official Node.js image as the base
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY ./Server/package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the app source code
COPY . .

# Specify the command to run your app
CMD ["node", "index.js"]
