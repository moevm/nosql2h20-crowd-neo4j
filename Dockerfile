FROM alpine:3.9
WORKDIR /app
COPY ./package*.json ./
RUN apk add --update nodejs npm
RUN npm install
COPY . /app
EXPOSE 3000
CMD ["node", "./src/app.js"]
