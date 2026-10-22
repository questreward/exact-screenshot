FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY src ./src
RUN mkdir /app/data && chown -R node:node /app
USER node
CMD ["node", "src/index.mjs"]