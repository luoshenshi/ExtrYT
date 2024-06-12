# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy Node.js dependencies and install them
COPY ./Server/package*.json ./Server/
RUN npm ci --prefix ./Server

# Add deadsnakes PPA and install Python 3.9
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y python3.9 python3.9-distutils python3-pip libsndfile1 ffmpeg && \
    rm /usr/bin/python3 && \
    ln -s /usr/bin/python3.9 /usr/bin/python3 && \
    curl https://bootstrap.pypa.io/get-pip.py | python3.9

# Copy Python dependencies and install them
COPY ./Python/requirements.txt ./Python/
RUN pip3 install --verbose -r ./Python/requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (adjust if necessary)
EXPOSE 3000

# Define the command to run the application
CMD ["node", "Server/index.js"]
