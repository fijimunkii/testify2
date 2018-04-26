FROM node:8.11.1

MAINTAINER Harrison Powers, harrisonpowers@gmail.com

ADD . /root

WORKDIR /root

RUN npm i && npm i -g pm2

CMD pm2 start index.js --name testify --no-daemon
