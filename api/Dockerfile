FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./
COPY src ./src
ENV NODE_ENV=production PORT=4000
USER node
EXPOSE 4000
CMD ["node", "server.js"]
