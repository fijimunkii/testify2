FROM node:8.11.1

MAINTAINER Harrison Powers, harrisonpowers@gmail.com

RUN apt-get update && apt-get install -qq -y python-pip libpython-dev \
  && curl -O https://bootstrap.pypa.io/get-pip.py && python get-pip.py \
  && pip install -q awscli --upgrade

ADD . /root

WORKDIR /root

RUN npm i && npm i -g pm2

CMD bash sync_config.sh \
  && pm2 start index.js --name testify --no-daemon
