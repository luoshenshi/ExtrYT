WORKDIR /usr/src/app

COPY ./Server/package*.json ./Server
RUN npm ci ./Server
RUN pip install -r ./Python/requirements.txt
COPY . .
CMD [ "node", "index.js" ]