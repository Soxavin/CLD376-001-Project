FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

# Dependencies first: this layer is cached until package*.json changes
COPY package*.json ./
RUN npm ci --omit=dev

# Then the source, owned by the unprivileged node user
COPY --chown=node:node src ./src
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1
CMD ["node", "src/index.js"]
