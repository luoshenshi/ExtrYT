FROM python:3.9-slim AS python_node

WORKDIR /app

COPY Python/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update && apt-get install -y nodejs npm && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY server /app/server/
COPY . /app/

RUN ls -la /app && ls -la /app/server || echo "server/ directory missing" \
    && ls -la /app/server/package.json || echo "package.json missing"

WORKDIR /app/server

RUN npm install

EXPOSE 3000

CMD ["node", "index.js"]
