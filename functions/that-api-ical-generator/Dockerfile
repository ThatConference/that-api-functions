# THAT Dockerfile

FROM node:16-alpine

# Create and change to app directory
WORKDIR /usr/src/that

# Copy build artifacts into image
COPY __build__ ./

# install production node_modules
RUN npm pkg delete scripts.prepare \
 && ls -lasi && npm install --omit=dev \
 && mkdir /tmp/gcreds

CMD [ "node", "index.js" ]
