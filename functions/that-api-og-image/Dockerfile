# THAT gateway Dockerfile

FROM node:14-alpine3.14

# Create and change to app directory
WORKDIR /usr/src/that

# Copy build artifacts into image
COPY __build__ ./

# install production node_modules
RUN ls -lasi && npm install --production

CMD [ "npm", "start" ]
