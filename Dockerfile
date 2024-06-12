WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci ./Server
RUN pip install -r ./Python/requirements.txt
COPY . .
CMD [ "node", "index.js" ]